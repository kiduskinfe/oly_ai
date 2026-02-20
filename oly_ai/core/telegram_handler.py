# Copyright (c) 2026, OLY Technologies and contributors
# Telegram AI Handler — Auto-respond to incoming Telegram messages via AI
# Hooks into Telegram Message after_insert to provide intelligent chatbot replies

import frappe
from frappe import _
from frappe.utils import cstr, now_datetime


# Maximum conversation history messages to include for LLM context
MAX_HISTORY_MESSAGES = 20


def on_incoming_telegram_message(doc, method=None):
	"""Hook: Triggered after a Telegram Message is inserted.

	If the message is incoming, the chat has bot handling enabled,
	and Telegram AI is turned on, queues an AI response.
	"""
	if not _should_respond(doc):
		return

	# Queue the AI response generation (don't block message insertion)
	frappe.enqueue(
		"oly_ai.core.telegram_handler.generate_ai_response",
		message_name=doc.name,
		queue="short",
		deduplicate=True,
		job_id=f"oly_ai_telegram_{doc.name}",
	)


def _should_respond(doc):
	"""Check if this Telegram Message qualifies for an AI response."""
	# Must be an incoming message
	if doc.direction != "Incoming":
		return False

	# Must be a text message (skip media-only, stickers, etc.)
	if doc.message_type not in ("Text",):
		return False

	# Must have content
	content = cstr(doc.content).strip()
	if not content:
		return False

	# Don't respond to bot commands (handled by bot_handler)
	if content.startswith("/"):
		return False

	# Check if the chat has bot handling enabled (not human-assigned)
	try:
		chat = frappe.get_cached_doc("Telegram Chat", doc.chat)
		if not chat.is_bot_handling:
			return False
	except Exception:
		return False

	# Check if AI Telegram is enabled in settings
	try:
		settings = frappe.get_cached_doc("AI Settings")
		if not settings.is_configured():
			return False
		if not getattr(settings, "enable_telegram_ai", 0):
			return False
	except Exception:
		return False

	return True


def generate_ai_response(message_name):
	"""Generate an AI response for an incoming Telegram message.

	Builds conversation history, enriches with ERP context for linked
	customers/leads, calls the LLM, and sends the reply via Telegram Bot API.
	"""
	try:
		msg = frappe.get_doc("Telegram Message", message_name)
		chat = frappe.get_doc("Telegram Chat", msg.chat)

		# Double-check the chat is still bot-handled (agent may have claimed it)
		if not chat.is_bot_handling:
			return

		# Build conversation history for multi-turn context
		history = _build_conversation_history(chat.name)

		# Build ERP context if customer/lead is linked
		erp_context = _build_erp_context(chat)

		# Build the user prompt (current message + ERP context)
		user_prompt = _build_prompt(msg, erp_context)

		# Build system prompt
		system_prompt = _get_telegram_system_prompt(chat)

		# Assemble LLM messages with conversation history
		messages = [{"role": "system", "content": system_prompt}]

		# Add prior conversation turns (excluding the current message)
		for h_msg in history[:-1]:
			role = "user" if h_msg.direction == "Incoming" else "assistant"
			text = cstr(h_msg.content or h_msg.caption or "").strip()
			if text:
				messages.append({"role": role, "content": text})

		# Add current message as the final user turn
		messages.append({"role": "user", "content": user_prompt})

		# Call the LLM
		from oly_ai.core.provider import LLMProvider

		provider = LLMProvider()
		response = provider.chat(messages)
		reply_text = cstr(response.get("content", "")).strip()

		if not reply_text:
			return

		# Sanitize for Telegram Markdown (escape problematic chars)
		reply_text = _sanitize_for_telegram(reply_text)

		# Send reply via Telegram Bot API
		from oly.telegram.bot_handler import send_message

		result = send_message(
			account_name=chat.account,
			chat_id=chat.chat_id,
			text=reply_text,
			parse_mode="Markdown",
			reply_to_message_id=msg.telegram_message_id,
		)

		if result.get("ok"):
			# Save the outgoing message to the Telegram Message doctype
			from oly.telegram.message_processor import _save_outgoing_message

			_save_outgoing_message(
				chat=chat,
				account_name=chat.account,
				content=reply_text,
				telegram_message_id=str(result["result"]["message_id"]),
			)

			frappe.logger("oly_ai").info(
				f"AI Telegram reply sent to {chat.name} "
				f"(trigger: {message_name})"
			)
		else:
			# If Markdown parse fails, retry with plain text
			error_desc = cstr(result.get("description", ""))
			if "parse" in error_desc.lower() or "markdown" in error_desc.lower():
				result = send_message(
					account_name=chat.account,
					chat_id=chat.chat_id,
					text=reply_text,
					parse_mode=None,
					reply_to_message_id=msg.telegram_message_id,
				)
				if result.get("ok"):
					from oly.telegram.message_processor import _save_outgoing_message

					_save_outgoing_message(
						chat=chat,
						account_name=chat.account,
						content=reply_text,
						telegram_message_id=str(result["result"]["message_id"]),
					)
					return

			frappe.log_error(
				f"Telegram send failed for {chat.name}: {result}",
				"AI Telegram Response",
			)

	except Exception as e:
		frappe.log_error(
			f"AI Telegram response failed for message {message_name}: {e}",
			"AI Telegram Response",
		)


# ─── Helpers ──────────────────────────────────────────────────────────


def _build_conversation_history(chat_name, limit=MAX_HISTORY_MESSAGES):
	"""Fetch recent text messages from the chat for multi-turn context."""
	messages = frappe.get_all(
		"Telegram Message",
		filters={
			"chat": chat_name,
			"message_type": ["in", ["Text"]],
		},
		fields=["direction", "content", "caption", "sender_name", "sent_at"],
		order_by="sent_at desc",
		limit=limit,
	)
	# Reverse to chronological order (oldest first)
	messages.reverse()
	return messages


def _build_erp_context(chat):
	"""Enrich the prompt with ERP data from linked Customer/Lead/Contact."""
	context_parts = []

	# ── Customer context ──
	if chat.customer:
		try:
			customer = frappe.get_cached_doc("Customer", chat.customer)
			context_parts.append(f"Customer: {customer.customer_name}")
			if customer.get("customer_group"):
				context_parts.append(f"Group: {customer.customer_group}")
			if customer.get("territory"):
				context_parts.append(f"Territory: {customer.territory}")

			# Recent orders
			orders = frappe.get_all(
				"Sales Order",
				filters={"customer": chat.customer, "docstatus": 1},
				fields=["name", "grand_total", "currency", "status", "transaction_date"],
				order_by="transaction_date desc",
				limit=3,
			)
			if orders:
				order_lines = []
				for o in orders:
					order_lines.append(
						f"  - {o.name}: {o.currency} {o.grand_total} "
						f"({o.status}, {o.transaction_date})"
					)
				context_parts.append("Recent Orders:\n" + "\n".join(order_lines))

			# Open issues
			issues = frappe.get_all(
				"Issue",
				filters={"customer": chat.customer, "status": ["!=", "Closed"]},
				fields=["name", "subject", "status", "priority"],
				limit=3,
			)
			if issues:
				issue_lines = [
					f"  - {i.name}: {i.subject} ({i.status}, {i.priority})"
					for i in issues
				]
				context_parts.append("Open Issues:\n" + "\n".join(issue_lines))

			# Outstanding balance
			try:
				from erpnext.accounts.utils import get_balance_on

				balance = frappe.db.sql(
					"""SELECT SUM(debit - credit) FROM `tabGL Entry`
					WHERE party_type='Customer' AND party=%s AND is_cancelled=0""",
					chat.customer,
				)
				if balance and balance[0][0]:
					context_parts.append(f"Outstanding Balance: {balance[0][0]:,.2f}")
			except Exception:
				pass
		except Exception:
			pass

	# ── Lead context ──
	if chat.lead:
		try:
			lead = frappe.get_cached_doc("Lead", chat.lead)
			context_parts.append(f"Lead: {lead.lead_name}")
			if lead.get("company_name"):
				context_parts.append(f"Company: {lead.company_name}")
			if lead.get("status"):
				context_parts.append(f"Lead Status: {lead.status}")
			if lead.get("source"):
				context_parts.append(f"Source: {lead.source}")
		except Exception:
			pass

	# ── Contact context ──
	if chat.contact and not (chat.customer or chat.lead):
		try:
			contact = frappe.get_cached_doc("Contact", chat.contact)
			name = " ".join(filter(None, [contact.first_name, contact.last_name]))
			if name:
				context_parts.append(f"Contact: {name}")
			if contact.get("company_name"):
				context_parts.append(f"Company: {contact.company_name}")
		except Exception:
			pass

	return "\n".join(context_parts) if context_parts else ""


def _build_prompt(msg, erp_context):
	"""Build the user prompt combining the message and ERP context."""
	content = cstr(msg.content).strip()

	if erp_context:
		return (
			f"{content}\n\n"
			f"---\n"
			f"Customer/Lead Context (internal, don't quote directly):\n"
			f"{erp_context}"
		)
	return content


def _get_telegram_system_prompt(chat):
	"""Build a dynamic system prompt tailored for Telegram chat."""
	company_context = _get_company_context()
	company_name = company_context.get("company_name", "the company")

	contact_info = ""
	if chat.contact_name:
		contact_info = f"\nYou are chatting with: {chat.contact_name}"
	if chat.get("telegram_username"):
		contact_info += f" (@{chat.telegram_username})"

	return (
		f"You are a helpful customer service AI assistant for {company_name}, "
		f"responding via Telegram messenger.\n"
		f"{company_context.get('description', '')}\n"
		f"{contact_info}\n\n"
		f"Rules:\n"
		f"- Be friendly, concise, and helpful — this is a chat, keep it conversational\n"
		f"- Keep responses short (1-3 paragraphs max) — Telegram is a messaging app\n"
		f"- Use simple formatting: *bold*, _italic_, `code` only\n"
		f"- Address the user's question directly\n"
		f"- If you have customer/order context, reference it naturally without quoting raw data\n"
		f"- If you can't answer something, offer to connect them with a human agent\n"
		f"- Don't make promises about orders, refunds, or delivery without confirmed data\n"
		f"- Be warm and professional — represent the brand well\n"
		f"- Answer in the same language the user writes in\n"
		f"- If the user asks for a human, acknowledge and suggest they'll be connected shortly"
	)


def _get_company_context():
	"""Fetch company information for the system prompt."""
	try:
		company_name = frappe.db.get_single_value("Global Defaults", "default_company")
		if not company_name:
			companies = frappe.get_all("Company", limit=1, pluck="name")
			company_name = companies[0] if companies else "the company"

		company = frappe.get_cached_doc("Company", company_name)

		description = ""
		if company.get("company_description"):
			description = company.company_description
		elif company.get("domain"):
			description = f"Industry: {company.domain}"

		return {
			"company_name": company.name,
			"description": description,
		}
	except Exception:
		return {"company_name": "the company", "description": ""}


def _sanitize_for_telegram(text):
	"""Light sanitization for Telegram Markdown compatibility.

	Telegram's Markdown parser is strict — unmatched formatting chars
	cause parse errors. This does basic balancing.
	"""
	# If there's an odd number of * or _, the parser may fail
	# Simple fix: if unbalanced, strip them
	for char in ("*", "_", "`"):
		if text.count(char) % 2 != 0:
			text = text.replace(char, "")
	return text
