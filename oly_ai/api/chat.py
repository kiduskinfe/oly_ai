# Copyright (c) 2026, OLY Technologies and contributors
# Chat API — CRUD operations and messaging for AI Chat Sessions
# All endpoints are user-scoped: each user can only access their own chats.

import frappe
from frappe import _
from oly_ai.core.provider import LLMProvider
from oly_ai.core.cache import get_cached_response, set_cached_response
from oly_ai.core.cost_tracker import check_budget, track_usage


@frappe.whitelist()
def get_sessions(search=None, limit=50, offset=0):
	"""Get chat sessions for the current user.

	Returns:
		list: [{"name", "title", "modified", "message_count", "preview"}]
	"""
	user = frappe.session.user
	filters = {"user": user}

	if search:
		filters["title"] = ["like", f"%{search}%"]

	sessions = frappe.get_all(
		"AI Chat Session",
		filters=filters,
		fields=["name", "title", "modified", "creation"],
		order_by="modified desc",
		limit_page_length=int(limit),
		start=int(offset),
	)

	# Get last message preview for each session
	for s in sessions:
		last_msg = frappe.db.sql(
			"""SELECT content FROM `tabAI Chat Message`
			WHERE parent=%s ORDER BY idx DESC LIMIT 1""",
			s.name,
			as_dict=True,
		)
		s["preview"] = (last_msg[0].content[:80] + "...") if last_msg else ""
		msg_count = frappe.db.count("AI Chat Message", {"parent": s.name})
		s["message_count"] = msg_count

	return sessions


@frappe.whitelist()
def create_session(title=None):
	"""Create a new chat session.

	Returns:
		dict: {"name", "title", "modified"}
	"""
	user = frappe.session.user

	session = frappe.new_doc("AI Chat Session")
	session.title = title or "New Chat"
	session.user = user
	session.model = frappe.db.get_single_value("AI Settings", "default_model") or "gpt-4o-mini"
	session.flags.ignore_permissions = True
	session.insert()
	frappe.db.commit()

	return {
		"name": session.name,
		"title": session.title,
		"modified": str(session.modified),
	}


@frappe.whitelist()
def get_messages(session_name):
	"""Get all messages for a chat session. User-scoped.

	Returns:
		list: [{"role", "content", "model", "cost", "tokens_input", "tokens_output", "creation"}]
	"""
	user = frappe.session.user

	# Verify ownership
	session_user = frappe.db.get_value("AI Chat Session", session_name, "user")
	if not session_user:
		frappe.throw(_("Chat session not found"), frappe.DoesNotExistError)
	if session_user != user and user != "Administrator":
		frappe.throw(_("Access denied"), frappe.PermissionError)

	messages = frappe.db.sql(
		"""SELECT role, content, model, tokens_input, tokens_output,
		          cost, response_time, creation
		FROM `tabAI Chat Message`
		WHERE parent=%s
		ORDER BY idx ASC""",
		session_name,
		as_dict=True,
	)

	return messages


@frappe.whitelist()
def send_message(session_name, message):
	"""Send a user message and get AI response. Appends both to the session.

	Args:
		session_name: AI Chat Session name
		message: User's message text

	Returns:
		dict: {"content", "model", "cost", "tokens", "response_time", "sources"}
	"""
	user = frappe.session.user

	# Verify ownership
	session_user = frappe.db.get_value("AI Chat Session", session_name, "user")
	if not session_user:
		frappe.throw(_("Chat session not found"), frappe.DoesNotExistError)
	if session_user != user and user != "Administrator":
		frappe.throw(_("Access denied"), frappe.PermissionError)

	# Check AI is configured
	settings = frappe.get_cached_doc("AI Settings")
	if not settings.is_configured():
		frappe.throw(
			_("AI is not configured. Please set up AI Settings."),
			title=_("AI Not Configured"),
		)

	# Budget check
	allowed, reason = check_budget(user)
	if not allowed:
		frappe.throw(_(reason))

	# Load the session
	session = frappe.get_doc("AI Chat Session", session_name)

	# Add user message to session
	session.append("messages", {"role": "user", "content": message})

	# Build conversation history for context (last 20 messages max)
	conversation = []
	for msg in session.messages[-20:]:
		conversation.append({"role": msg.role, "content": msg.content})

	# System prompt
	system_prompt = """You are an AI assistant for ERPNext ERP system at OLY Technologies.
You help employees with questions about:
- Company SOPs and policies
- How to use ERPNext features
- Business processes and workflows
- HR policies, leave rules, payroll questions
- Sales and procurement processes

Rules:
- Be concise and helpful.
- If you don't know, say so honestly.
- Reference specific ERPNext DocTypes, reports, or features when applicable.
- Never fabricate company policies or data.
- Format responses with markdown when helpful (headers, lists, code blocks).
- When referencing sources, cite the source number [Source N]."""

	# Try RAG for context
	rag_context = ""
	sources = []
	try:
		from oly_ai.core.rag.retriever import build_rag_context
		rag_context, sources = build_rag_context(message, top_k=5, min_score=0.7)
	except Exception:
		pass

	# Build messages for the LLM
	llm_messages = [{"role": "system", "content": system_prompt}]
	if rag_context:
		llm_messages.append({
			"role": "system",
			"content": f"Relevant company documents:\n\n{rag_context}",
		})
	llm_messages.extend(conversation)

	model = settings.default_model

	try:
		provider = LLMProvider(settings)
		result = provider.chat(llm_messages, model=model)
		cost = track_usage(model, result["tokens_input"], result["tokens_output"], user)

		# Add assistant response to session
		session.append("messages", {
			"role": "assistant",
			"content": result["content"],
			"model": result["model"],
			"tokens_input": result["tokens_input"],
			"tokens_output": result["tokens_output"],
			"cost": cost,
			"response_time": result["response_time"],
		})

		# Update session totals
		session.total_tokens = (session.total_tokens or 0) + result["tokens_input"] + result["tokens_output"]
		session.total_cost = (session.total_cost or 0) + cost

		# Auto-title from first user message
		if session.title == "New Chat" and len([m for m in session.messages if m.role == "user"]) == 1:
			session.title = message[:60] + ("..." if len(message) > 60 else "")

		session.flags.ignore_permissions = True
		session.save()
		frappe.db.commit()

		# Audit log
		try:
			from oly_ai.api.gateway import _log_audit
			_log_audit(
				user, "Ask AI", "", "", model,
				message, result["content"],
				result["tokens_input"], result["tokens_output"],
				cost, result["response_time"], "Success",
			)
		except Exception:
			pass

		return {
			"content": result["content"],
			"model": result["model"],
			"cost": cost,
			"tokens": result["tokens_input"] + result["tokens_output"],
			"response_time": result["response_time"],
			"sources": sources,
			"session_title": session.title,
		}

	except Exception as e:
		# Still save the user message even on error
		session.flags.ignore_permissions = True
		session.save()
		frappe.db.commit()
		raise


@frappe.whitelist()
def rename_session(session_name, title):
	"""Rename a chat session."""
	user = frappe.session.user
	session_user = frappe.db.get_value("AI Chat Session", session_name, "user")
	if not session_user:
		frappe.throw(_("Chat session not found"))
	if session_user != user and user != "Administrator":
		frappe.throw(_("Access denied"))

	frappe.db.set_value("AI Chat Session", session_name, "title", title)
	frappe.db.commit()
	return {"success": True}


@frappe.whitelist()
def delete_session(session_name):
	"""Delete a chat session."""
	user = frappe.session.user
	session_user = frappe.db.get_value("AI Chat Session", session_name, "user")
	if not session_user:
		frappe.throw(_("Chat session not found"))
	if session_user != user and user != "Administrator":
		frappe.throw(_("Access denied"))

	frappe.delete_doc("AI Chat Session", session_name, force=True, ignore_permissions=True)
	frappe.db.commit()
	return {"success": True}
