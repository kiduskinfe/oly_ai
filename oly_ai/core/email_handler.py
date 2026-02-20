# Copyright (c) 2026, OLY Technologies and contributors
# Email Handler — Auto-detect incoming emails and generate AI draft replies
# Hooks into Communication after_insert to offer AI-assisted responses

import frappe
from frappe import _
from frappe.utils import cstr, now_datetime, get_url_to_form


# DocTypes that should trigger AI auto-response drafts
AUTO_RESPOND_DOCTYPES = {
	"Issue", "Lead", "Opportunity", "Sales Order", "Purchase Order",
	"Quotation", "Customer", "Supplier", "Warranty Claim",
}


def on_incoming_communication(doc, method=None):
	"""Hook: Triggered after a Communication is inserted.

	If it's an incoming email linked to a supported DocType,
	generates an AI draft reply and attaches it as a comment.
	Auto-response can be enabled/disabled in AI Settings.
	"""
	if not _should_auto_respond(doc):
		return

	# Queue the AI response generation (don't block Communication insertion)
	frappe.enqueue(
		"oly_ai.core.email_handler.generate_auto_response",
		communication_name=doc.name,
		queue="short",
		deduplicate=True,
		job_id=f"oly_ai_auto_reply_{doc.name}",
	)


def _should_auto_respond(doc):
	"""Check if this Communication qualifies for AI auto-response."""
	# Must be an incoming email/communication
	if doc.communication_type != "Communication":
		return False
	if doc.sent_or_received != "Received":
		return False
	if not doc.reference_doctype or not doc.reference_name:
		return False

	# Check if AI auto-response is enabled
	try:
		settings = frappe.get_cached_doc("AI Settings")
		if not getattr(settings, "enable_auto_response", 0):
			return False

		# Check allowed doctypes (use configured list or default)
		allowed = set()
		for row in settings.get("auto_response_doctypes", []):
			if row.enabled:
				allowed.add(row.document_type)

		# If no configured list, use defaults
		if not allowed:
			allowed = AUTO_RESPOND_DOCTYPES

		if doc.reference_doctype not in allowed:
			return False

	except Exception:
		return False

	# Don't auto-respond to system/internal emails
	sender = cstr(doc.sender).lower()
	if not sender or sender in ("administrator", "admin@example.com"):
		return False

	# Don't respond to outgoing emails mistakenly flagged
	if "@" not in sender:
		return False

	return True


def generate_auto_response(communication_name):
	"""Generate an AI draft reply for an incoming communication.

	Creates a Comment on the reference document with the AI's suggested reply.
	Does NOT auto-send — a human must review and approve the draft.
	"""
	try:
		comm = frappe.get_doc("Communication", communication_name)
		if not comm.reference_doctype or not comm.reference_name:
			return

		# Build context from the document
		from oly_ai.core.context import get_document_context

		doc_context = ""
		try:
			doc_context = get_document_context(
				comm.reference_doctype,
				comm.reference_name,
				include_comms=True,
				include_comments=True,
				max_length=6000,
			)
		except Exception:
			doc_context = f"# {comm.reference_doctype}: {comm.reference_name}"

		# Build the prompt
		sender = cstr(comm.sender)
		subject = cstr(comm.subject)
		content = frappe.utils.strip_html_tags(cstr(comm.content))[:3000]

		# Analyze sentiment
		sentiment_info = ""
		try:
			from oly_ai.core.sentiment import analyze_sentiment
			sentiment_result = analyze_sentiment(content)
			if sentiment_result:
				sentiment_info = (
					f"\n**Detected Sentiment:** {sentiment_result.get('sentiment', 'neutral')} "
					f"(confidence: {sentiment_result.get('confidence', 0):.0%})"
					f"\n**Urgency:** {sentiment_result.get('urgency', 'normal')}"
				)
		except (ImportError, Exception):
			pass

		prompt = (
			f"You received an incoming email that needs a professional reply.\n\n"
			f"**From:** {sender}\n"
			f"**Subject:** {subject}\n"
			f"**Message:**\n{content}\n"
			f"{sentiment_info}\n\n"
			f"**Document Context:**\n{doc_context}\n\n"
			f"Draft a professional, helpful reply to this email. "
			f"Address the sender's questions or concerns based on the document context. "
			f"Be concise, polite, and actionable. "
			f"If you cannot fully answer from the context, acknowledge what you know "
			f"and note what needs to be checked by a team member."
		)

		# Get dynamic system prompt
		system_prompt = _get_auto_response_system_prompt()

		# Call the LLM
		from oly_ai.core.provider import LLMProvider
		provider = LLMProvider()

		messages = [
			{"role": "system", "content": system_prompt},
			{"role": "user", "content": prompt},
		]

		response = provider.chat(messages)
		draft_reply = cstr(response.get("content", "")).strip()

		if not draft_reply:
			return

		# Store the draft as a Comment on the reference document
		comment_text = (
			f'<div class="ai-auto-reply-draft">'
			f'<strong>🤖 AI Draft Reply</strong> '
			f'<small>(auto-generated from incoming email by {sender})</small>'
			f'<hr>'
			f'<div class="ai-draft-content">{frappe.utils.md_to_html(draft_reply)}</div>'
			f'<hr>'
			f'<small>Review this draft and click "Suggest Reply" on the AI panel to refine, '
			f'or use "Send Communication" in Execute mode to send.</small>'
			f'</div>'
		)

		comment = frappe.get_doc({
			"doctype": "Comment",
			"comment_type": "Comment",
			"reference_doctype": comm.reference_doctype,
			"reference_name": comm.reference_name,
			"comment_by": "Administrator",
			"content": comment_text,
		})
		comment.flags.ignore_permissions = True
		comment.insert()

		# Create a notification for the document owner / assigned_to
		_notify_auto_response(comm, draft_reply)

		# Log the auto-response
		frappe.logger("oly_ai").info(
			f"AI auto-response draft generated for {comm.reference_doctype}/{comm.reference_name} "
			f"(Communication: {communication_name})"
		)

	except Exception as e:
		frappe.log_error(
			f"AI auto-response failed for Communication {communication_name}: {e}",
			"AI Auto Response"
		)


def _get_auto_response_system_prompt():
	"""Build a dynamic system prompt for auto-response generation."""
	company_context = _get_company_context()

	return (
		f"You are a professional customer service AI assistant for {company_context.get('company_name', 'the company')}.\n"
		f"{company_context.get('description', '')}\n\n"
		f"Your role is to draft email replies to incoming customer, supplier, and partner communications.\n\n"
		f"Rules:\n"
		f"- Be professional, concise, and helpful\n"
		f"- Address the sender's specific questions or concerns\n"
		f"- Reference relevant document details (order numbers, amounts, dates)\n"
		f"- If you don't have enough information, acknowledge and suggest next steps\n"
		f"- Use appropriate greeting and sign-off\n"
		f"- Don't make promises or commitments the company can't verify\n"
		f"- Keep the tone warm but professional\n"
		f"- Format as plain text (no markdown), suitable for email"
	)


def _get_company_context():
	"""Fetch company information for dynamic system prompt."""
	try:
		# Get the default company
		company_name = frappe.db.get_single_value("Global Defaults", "default_company")
		if not company_name:
			companies = frappe.get_all("Company", limit=1, pluck="name")
			company_name = companies[0] if companies else "OLY Technologies"

		company = frappe.get_cached_doc("Company", company_name)

		description = ""
		if company.get("company_description"):
			description = company.company_description
		elif company.get("domain"):
			description = f"Industry: {company.domain}"

		return {
			"company_name": company.name,
			"description": description,
			"domain": company.get("domain", ""),
			"country": company.get("country", ""),
			"default_currency": company.get("default_currency", ""),
		}
	except Exception:
		return {"company_name": "the company", "description": ""}


def _notify_auto_response(comm, draft_reply):
	"""Notify the document owner and assignees about the AI draft."""
	try:
		# Find who should be notified
		recipients = set()

		# Document owner
		ref_doc = frappe.get_doc(comm.reference_doctype, comm.reference_name)
		if ref_doc.owner and ref_doc.owner != "Administrator":
			recipients.add(ref_doc.owner)

		# Assigned users
		assignments = frappe.get_all(
			"ToDo",
			filters={
				"reference_type": comm.reference_doctype,
				"reference_name": comm.reference_name,
				"status": "Open",
			},
			fields=["allocated_to"],
		)
		for a in assignments:
			if a.allocated_to:
				recipients.add(a.allocated_to)

		# Send notification
		for user in recipients:
			try:
				notification = frappe.new_doc("Notification Log")
				notification.for_user = user
				notification.type = "Alert"
				notification.subject = _(
					"AI Draft Reply: {0} {1}"
				).format(comm.reference_doctype, comm.reference_name)
				notification.email_content = _(
					"An incoming email from **{sender}** on **{doctype} {name}** "
					"has an AI-drafted reply ready for review.\n\n"
					"[Review draft →]({link})"
				).format(
					sender=comm.sender,
					doctype=comm.reference_doctype,
					name=comm.reference_name,
					link=get_url_to_form(comm.reference_doctype, comm.reference_name),
				)
				notification.document_type = comm.reference_doctype
				notification.document_name = comm.reference_name
				notification.from_user = "Administrator"
				notification.flags.ignore_permissions = True
				notification.insert()
			except Exception:
				pass

	except Exception:
		pass
