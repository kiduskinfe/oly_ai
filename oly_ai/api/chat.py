# Copyright (c) 2026, OLY Technologies and contributors
# Chat API — CRUD operations and messaging for AI Chat Sessions
# All endpoints are user-scoped: each user can only access their own chats.

import base64
import json
import mimetypes
import os

import frappe
from frappe import _
from oly_ai.core.provider import LLMProvider
from oly_ai.core.cache import get_cached_response, set_cached_response
from oly_ai.core.cost_tracker import check_budget, track_usage

import re
import time


# Image extensions that can be sent to vision-capable models
_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}


# ─── System Prompts (module-level so stream.py can import) ────

SYSTEM_PROMPTS = {
	"ask": """You are an AI assistant for ERPNext ERP system at OLY Technologies.
You help employees with questions about:
- Company SOPs and policies
- How to use ERPNext features
- Business processes and workflows
- HR policies, leave rules, payroll questions
- Sales and procurement processes

Capabilities:
- You CAN generate images using DALL-E when asked. If a user asks you to generate, create, make, or draw an image, logo, banner, poster, artwork, or illustration, do NOT refuse — the system will automatically route the request to the DALL-E image generation API.
- Answer questions, provide guidance, and reference ERPNext features.

Rules:
- Be concise and helpful.
- If you don't know, say so honestly.
- Reference specific ERPNext DocTypes, reports, or features when applicable.
- Never fabricate company policies or data.
- Format responses with markdown when helpful (headers, lists, code blocks).
- When referencing sources, cite the source number [Source N].
- When asked to generate an image, confirm you are generating it (the system handles the actual generation).""",


	"agent": """You are an advanced AI agent for OLY Technologies' ERPNext system. You operate in Agent mode — think step-by-step, analyze deeply, and provide comprehensive solutions. When asked to research a topic, produce thorough, structured research reports.

Capabilities:
- You CAN generate images using DALL-E when asked. If a user asks to generate/create/draw an image, logo, banner, etc., do NOT refuse — the system routes it to DALL-E automatically.
- Deep analysis of business processes and workflows across HR, Sales, Procurement, Finance, Manufacturing, and Projects
- Multi-step problem solving and strategic planning
- Data-driven recommendations based on ERPNext context
- Query any DocType: search, count, get details, run reports, aggregate summaries
- Read Communications and Comments linked to documents for full context
- Identifying bottlenecks, risks, and optimization opportunities
- Cross-functional analysis and impact assessment
- Deep research: cross-reference information across departments, identify patterns/trends/anomalies, compare alternatives with pros/cons

Approach:
1. Understand the user's goal thoroughly
2. Break complex requests into clear steps
3. Analyze relevant data and context from multiple angles
4. Provide actionable recommendations with specific ERPNext references
5. Anticipate follow-up questions and address them proactively

For research-heavy questions, structure your response as:
- **Executive Summary** — key findings in 2-3 sentences
- **Key Findings** — detailed analysis organized by theme
- **Comparative Analysis** — tables for side-by-side comparisons when applicable
- **Risks & Considerations** — edge cases and limitations
- **Recommendations** — numbered, prioritized action items

Rules:
- Think through problems methodically — show your reasoning
- Reference specific DocTypes, reports, workflows, and data points
- Provide concrete, actionable steps — not generic advice
- When analyzing data, specify what to look for and where in ERPNext
- Suggest ERPNext features, workflows, or automations that could help
- If you need more information to provide a complete answer, ask specific questions
- Distinguish between facts, analysis, and assumptions
- Quantify when possible — include numbers, percentages, timeframes
- Format with headers, numbered steps, tables, and clear organization
- When referencing sources, cite the source number [Source N].""",

	"execute": """You are an AI execution assistant for OLY Technologies' ERPNext system. You operate in Execute mode — you can take real actions on behalf of the user with their approval.

Your capabilities (all actions require user approval before execution):
- **Generate Images**: Create images via DALL-E when requested (the system auto-routes image requests to DALL-E)
- **Create** documents: Task, ToDo, Leave Application, Sales Order, Purchase Order, Journal Entry, etc.
- **Update** any document fields
- **Submit** draft documents (Sales Orders, Purchase Orders, Journal Entries, Leave Applications, etc.)
- **Cancel** submitted documents (with warning about irreversibility)
- **Delete** documents (permanent, with strong warning)
- **Send Communications**: Reply to emails, send messages linked to any document (Lead, Issue, Sales Order, etc.)
- **Add Comments**: Add internal notes/annotations to any document
- **Query Data**: Search, count, get details, run reports, aggregate summaries across all DocTypes

IMPORTANT — Approval Flow:
Every write action (create, update, submit, cancel, delete, send communication, add comment) creates an "Action Request" that the user must approve before execution. This keeps the user in control. When you propose an action:
1. Explain clearly what you're about to do and why
2. Call the appropriate tool — it will create a pending action request
3. The user will see an approval card with "Approve & Execute" or "Reject" buttons
4. Only after the user approves will the action actually execute

Communication Rules:
- When sending communications, draft professional messages appropriate for the context
- Auto-detect recipients from the document if not explicitly provided
- Always include the subject line and clear message body
- Specify whether to actually send the email or just record the communication
- For replies, check existing Communications on the document for context first

Safety Rules:
- Always warn about destructive actions (cancel, delete, submit)
- For cancel/delete, explain what will happen and any dependencies
- Never submit without checking the document is in Draft state
- Never propose bulk deletes without explicit user confirmation
- Prefer update over delete when possible
- When in doubt, ask the user before proposing an action
- Format with clear headers, steps, and code blocks
- When referencing sources, cite the source number [Source N].""",

}

# Backward compat: "research" mode maps to "agent" prompt
SYSTEM_PROMPTS["research"] = SYSTEM_PROMPTS["agent"]

def _file_url_to_base64(file_url):
	"""Convert a Frappe file URL to a base64 data URI for the vision API."""
	try:
		# Resolve the actual file path on disk
		if file_url.startswith("/private/files/"):
			fpath = frappe.get_site_path(file_url.lstrip("/"))
		elif file_url.startswith("/files/"):
			fpath = frappe.get_site_path("public", file_url.lstrip("/"))
		else:
			return None

		if not os.path.exists(fpath):
			return None

		ext = os.path.splitext(fpath)[1].lower()
		if ext not in _IMAGE_EXTS:
			return None

		mime = mimetypes.guess_type(fpath)[0] or "image/png"
		with open(fpath, "rb") as f:
			b64 = base64.b64encode(f.read()).decode("utf-8")
		return f"data:{mime};base64,{b64}"
	except Exception:
		return None


def _build_multipart_content(text, file_urls):
	"""Build an OpenAI-style multipart content array with text + images.

	Returns a list like:
	  [{"type":"text","text":"..."}, {"type":"image_url","image_url":{"url":"data:..."}}]
	If no images could be resolved, returns the plain text string.
	"""
	parts = [{"type": "text", "text": text}]
	had_image = False
	for url in file_urls:
		data_uri = _file_url_to_base64(url)
		if data_uri:
			parts.append({"type": "image_url", "image_url": {"url": data_uri, "detail": "auto"}})
			had_image = True
	return parts if had_image else text


@frappe.whitelist()
def get_sessions(search=None, limit=50, offset=0, filter_type=None):
	"""Get chat sessions for the current user.

	Args:
		search: Search string for title
		limit: Max results
		offset: Pagination offset
		filter_type: 'mine' (default), 'shared', or 'all'

	Returns:
		list: [{"name", "title", "modified", "message_count", "preview", "owner", "shared"}]
	"""
	user = frappe.session.user
	filter_type = filter_type or "mine"

	if filter_type == "shared":
		# Sessions shared with me (not my own)
		shared_names = frappe.db.sql(
			"""SELECT parent FROM `tabAI Chat Shared User`
			WHERE user=%s AND parenttype='AI Chat Session'""",
			user, as_list=True,
		)
		shared_names = [r[0] for r in shared_names]
		if not shared_names:
			return []
		filters = {"name": ["in", shared_names]}
	elif filter_type == "all":
		# My own + shared with me
		shared_names = frappe.db.sql(
			"""SELECT parent FROM `tabAI Chat Shared User`
			WHERE user=%s AND parenttype='AI Chat Session'""",
			user, as_list=True,
		)
		shared_names = [r[0] for r in shared_names]
		# Build OR filter: user=me OR name in shared_names
		if shared_names:
			filters = {"name": ["in",
				[r[0] for r in frappe.db.sql(
					"""SELECT name FROM `tabAI Chat Session`
					WHERE user=%s OR name IN %s""",
					(user, shared_names), as_list=True,
				)]
			]}
		else:
			filters = {"user": user}
	else:
		# mine (default)
		filters = {"user": user}

	if search:
		filters["title"] = ["like", f"%{search}%"]

	sessions = frappe.get_all(
		"AI Chat Session",
		filters=filters,
		fields=["name", "title", "modified", "creation", "user", "is_pinned"],
		order_by="is_pinned desc, modified desc",
		limit_page_length=int(limit),
		start=int(offset),
	)

	# Get last message preview + shared flag
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
		s["is_owner"] = s["user"] == user
		s["owner_name"] = frappe.db.get_value("User", s["user"], "full_name") if s["user"] != user else ""
		# Number of users this session is shared with (useful for showing shared icon)
		s["shared_count"] = frappe.db.count("AI Chat Shared User", {"parent": s.name})

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
	"""Get all messages for a chat session. User-scoped or shared.

	Returns:
		list: [{"role", "content", "model", "cost", "tokens_input", "tokens_output", "creation"}]
	"""
	user = frappe.session.user

	# Verify ownership or shared access
	session_user = frappe.db.get_value("AI Chat Session", session_name, "user")
	if not session_user:
		frappe.throw(_("Chat session not found"), frappe.DoesNotExistError)
	if session_user != user and user != "Administrator":
		if not _is_shared_with(session_name, user):
			frappe.throw(_("Access denied"), frappe.PermissionError)

	messages = frappe.db.sql(
		"""SELECT idx, role, content, model, tokens_input, tokens_output,
		          cost, response_time, creation
		FROM `tabAI Chat Message`
		WHERE parent=%s
		ORDER BY idx ASC""",
		session_name,
		as_dict=True,
	)

	return messages


@frappe.whitelist()
def edit_message(session_name, message_idx, new_content, model=None, mode=None):
	"""Edit a user message at the given index, truncate everything after it,
	and re-generate the AI response.

	Args:
		session_name: AI Chat Session name
		message_idx: 1-based index of the user message to edit
		new_content: The edited message text
		model: (optional) Model override
		mode: (optional) Mode override
	Returns:
		dict with AI response (same shape as send_message)
	"""
	user = frappe.session.user
	session = frappe.get_doc("AI Chat Session", session_name)
	if session.user != user and user != "Administrator":
		if not _is_shared_with(session_name, user):
			frappe.throw(_("Access denied"), frappe.PermissionError)

	message_idx = int(message_idx)
	if message_idx < 1 or message_idx > len(session.messages):
		frappe.throw(_("Invalid message index"))

	msg = session.messages[message_idx - 1]
	if msg.role != "user":
		frappe.throw(_("Can only edit user messages"))

	# Truncate: remove all messages from this index onward
	session.messages = session.messages[:message_idx - 1]
	session.save()
	frappe.db.commit()

	# Re-send with the edited content
	return send_message(session_name, new_content, model=model, mode=mode)


@frappe.whitelist()
def regenerate_response(session_name, message_idx, model=None, mode=None):
	"""Regenerate the AI response at the given index.

	Removes the assistant message and everything after, then re-sends
	the preceding user message.

	Args:
		session_name: AI Chat Session name
		message_idx: 1-based index of the assistant message to regenerate
		model: (optional) Model override
		mode: (optional) Mode override
	Returns:
		dict with AI response (same shape as send_message)
	"""
	user = frappe.session.user
	session = frappe.get_doc("AI Chat Session", session_name)
	if session.user != user and user != "Administrator":
		if not _is_shared_with(session_name, user):
			frappe.throw(_("Access denied"), frappe.PermissionError)

	message_idx = int(message_idx)
	if message_idx < 1 or message_idx > len(session.messages):
		frappe.throw(_("Invalid message index"))

	msg = session.messages[message_idx - 1]
	if msg.role != "assistant":
		frappe.throw(_("Can only regenerate assistant messages"))

	# Find the preceding user message
	user_msg_content = None
	for i in range(message_idx - 2, -1, -1):
		if session.messages[i].role == "user":
			user_msg_content = session.messages[i].content
			break

	if not user_msg_content:
		frappe.throw(_("No preceding user message found"))

	# Truncate: remove from the user message index onward (to re-send it)
	truncate_at = message_idx - 1  # the assistant message
	# Also remove the user message so send_message re-appends it
	for i in range(truncate_at - 1, -1, -1):
		if session.messages[i].role == "user":
			truncate_at = i
			break

	session.messages = session.messages[:truncate_at]
	session.save()
	frappe.db.commit()

	return send_message(session_name, user_msg_content, model=model, mode=mode)


@frappe.whitelist()
def send_message(session_name, message, model=None, mode=None, file_urls=None):
	"""Send a user message and get AI response. Appends both to the session.

	Args:
		session_name: AI Chat Session name
		message: User's message text
		model: (optional) Model name override, e.g. "gpt-4o"
		mode: (optional) Interaction mode: "ask" (default), "agent", or "execute"
		file_urls: (optional) JSON-encoded list of Frappe file URLs for vision

	Returns:
		dict: {"content", "model", "cost", "tokens", "response_time", "sources"}
	"""
	user = frappe.session.user

	# Verify ownership or shared access
	session_user = frappe.db.get_value("AI Chat Session", session_name, "user")
	if not session_user:
		frappe.throw(_("Chat session not found"), frappe.DoesNotExistError)
	if session_user != user and user != "Administrator":
		if not _is_shared_with(session_name, user):
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

	# Auto-detect image generation requests BEFORE adding user message
	# (to avoid duplicate messages when routing to image generation)
	if _is_image_request(message) and not (file_urls and json.loads(file_urls) if isinstance(file_urls, str) else file_urls):
		try:
			result = _generate_image_internal(session, message, user, settings)
			return result
		except Exception as e:
			# Do not silently fall back to text chat; return a clear image-generation error.
			error_message = str(e)
			friendly = (
				"I tried to generate the image, but the image API request failed.\n\n"
				f"Error: {error_message}\n\n"
				"Please verify:\n"
				"1. AI provider is OpenAI (or OpenAI-compatible with /images/generations support)\n"
				"2. The API key has image-generation access\n"
				"3. Model 'dall-e-3' is available for your account\n"
				"4. Network can reach the provider endpoint\n\n"
				"Once fixed, send your prompt again and I will generate the image directly."
			)

			session.append("messages", {"role": "user", "content": message})
			session.append("messages", {
				"role": "assistant",
				"content": friendly,
				"model": "dall-e-3",
				"cost": 0,
				"response_time": 0,
			})

			if session.title == "New Chat":
				session.title = message[:60] + ("..." if len(message) > 60 else "")

			session.flags.ignore_permissions = True
			session.save()
			frappe.db.commit()

			return {
				"content": friendly,
				"model": "dall-e-3",
				"cost": 0,
				"tokens": 0,
				"response_time": 0,
				"sources": [],
				"session_title": session.title,
			}

	# Add user message to session
	session.append("messages", {"role": "user", "content": message})

	# Build conversation history for context using memory module
	try:
		from oly_ai.core.memory import get_session_context
		conversation = get_session_context(session)
	except Exception:
		# Fallback: use last 20 messages directly
		conversation = []
		for msg in session.messages[-20:]:
			conversation.append({"role": msg.role, "content": msg.content})

	# System prompt — varies by mode
	mode = mode or "ask"

	# Access control check
	try:
		from oly_ai.core.access_control import check_mode_access
		access = check_mode_access(user, mode)
	except frappe.PermissionError:
		raise
	except Exception:
		access = {"can_query_data": True, "can_execute_actions": False}

	system_prompt = SYSTEM_PROMPTS.get(mode, SYSTEM_PROMPTS["ask"])

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

	# Cross-session memory — inject remembered facts/preferences
	try:
		from oly_ai.core.long_term_memory import get_user_memories
		user_memories = get_user_memories(user, message_context=message)
		if user_memories:
			llm_messages.append({
				"role": "system",
				"content": user_memories,
			})
	except Exception:
		pass

	# @ Mention context — inject doctype schemas and/or specific document data
	try:
		doctype_only, specific_docs = _extract_doctype_mentions(message)
		if doctype_only:
			doctype_ctx = _build_doctype_context(doctype_only)
			if doctype_ctx:
				llm_messages.append({
					"role": "system",
					"content": doctype_ctx,
				})
		if specific_docs:
			# Also inject the schema for referenced doctypes
			ref_doctypes = list({dt for dt, _ in specific_docs})
			schema_ctx = _build_doctype_context(ref_doctypes)
			if schema_ctx:
				llm_messages.append({
					"role": "system",
					"content": schema_ctx,
				})
			doc_ctx = _build_specific_document_context(specific_docs)
			if doc_ctx:
				llm_messages.append({
					"role": "system",
					"content": doc_ctx,
				})
	except Exception:
		pass

	llm_messages.extend(conversation)

	# Resolve file uploads for vision
	parsed_files = []
	if file_urls:
		try:
			parsed_files = json.loads(file_urls) if isinstance(file_urls, str) else file_urls
		except Exception:
			parsed_files = []

	# If images are attached, replace the last user message content with multipart
	if parsed_files:
		last_user_content = _build_multipart_content(message, parsed_files)
		# Replace the last user message in llm_messages
		for i in range(len(llm_messages) - 1, -1, -1):
			if llm_messages[i].get("role") == "user":
				llm_messages[i]["content"] = last_user_content
				break

	# Determine model: use per-request override, else session/settings default
	model = model or settings.default_model
	requested_model = model
	model_fallback_used = False

	# Get available tools for this mode
	tools = None
	try:
		from oly_ai.core.tools import get_available_tools
		tool_list = get_available_tools(user=user, mode=mode)
		if tool_list:
			tools = tool_list
	except Exception:
		tools = None

	try:
		provider = LLMProvider(settings)

		# ── Tool calling loop ──
		# The LLM may call tools, we execute them and feed results back.
		# Max 5 iterations to prevent infinite loops.
		total_input_tokens = 0
		total_output_tokens = 0
		MAX_TOOL_ROUNDS = 5
		pending_actions = []  # Track action requests for approval

		for _round in range(MAX_TOOL_ROUNDS):
			try:
				result = provider.chat(llm_messages, model=model, tools=tools)
			except Exception as e:
				fallback = _get_fallback_model(model, settings)
				if fallback and (not model_fallback_used) and _is_model_unavailable_error(e):
					model = fallback
					model_fallback_used = True
					continue
				raise
			total_input_tokens += result.get("tokens_input", 0)
			total_output_tokens += result.get("tokens_output", 0)

			tool_calls = result.get("tool_calls")

			if not tool_calls:
				# No tool calls — LLM is done, use the text response
				break

			# Process tool calls
			from oly_ai.core.tools import execute_tool

			# Append the assistant message with tool calls to conversation
			assistant_msg = {"role": "assistant", "content": result.get("content")}
			if tool_calls:
				assistant_msg["tool_calls"] = tool_calls
			llm_messages.append(assistant_msg)

			for tc in tool_calls:
				fn_name = tc["function"]["name"]
				try:
					fn_args = json.loads(tc["function"]["arguments"])
				except json.JSONDecodeError:
					fn_args = {}

				tool_result = execute_tool(fn_name, fn_args, user=user)

				# Check if this is a pending action (needs approval)
				try:
					parsed_result = json.loads(tool_result)
					if parsed_result.get("status") == "pending_approval":
						# Link action to this session
						action_id = parsed_result.get("action_id")
						if action_id:
							frappe.db.set_value("AI Action Request", action_id, "session", session_name)
							frappe.db.commit()
						pending_actions.append(parsed_result)
				except (json.JSONDecodeError, TypeError):
					pass

				# Feed tool result back to the LLM
				llm_messages.append({
					"role": "tool",
					"tool_call_id": tc["id"],
					"content": tool_result,
				})

		# Final response content
		final_content = result.get("content") or ""
		if model_fallback_used and requested_model != model:
			final_content = (
				f"⚠️ Requested model '{requested_model}' is not available for this API key/provider. "
				f"Used '{result.get('model') or model}' instead.\n\n" + final_content
			)

		cost = track_usage(result.get("model") or model, total_input_tokens, total_output_tokens, user)

		# Add assistant response to session
		session.append("messages", {
			"role": "assistant",
			"content": final_content,
			"model": result["model"],
			"tokens_input": total_input_tokens,
			"tokens_output": total_output_tokens,
			"cost": cost,
			"response_time": result["response_time"],
		})

		# Update session totals
		session.total_tokens = (session.total_tokens or 0) + total_input_tokens + total_output_tokens
		session.total_cost = (session.total_cost or 0) + cost

		# Auto-title from first user message
		if session.title == "New Chat" and len([m for m in session.messages if m.role == "user"]) == 1:
			session.title = message[:60] + ("..." if len(message) > 60 else "")

		session.flags.ignore_permissions = True
		session.save()
		frappe.db.commit()

		# Summarize session if it's getting long
		try:
			from oly_ai.core.memory import maybe_summarize_session
			maybe_summarize_session(session)
		except Exception:
			pass

		# Extract cross-session memories (long-term memory)
		try:
			from oly_ai.core.long_term_memory import extract_memories_from_session
			extract_memories_from_session(session_name)
		except Exception:
			pass

		# Audit log
		try:
			from oly_ai.api.gateway import _log_audit
			_log_audit(
				user, "Ask AI", "", "", result.get("model") or model,
				message, final_content,
				total_input_tokens, total_output_tokens,
				cost, result["response_time"], "Success",
			)
		except Exception:
			pass

		return {
			"content": final_content,
			"model": result["model"],
			"cost": cost,
			"tokens": total_input_tokens + total_output_tokens,
			"response_time": result["response_time"],
			"sources": sources,
			"session_title": session.title,
			"pending_actions": pending_actions if pending_actions else None,
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


@frappe.whitelist()
def pin_session(session_name):
	"""Pin or unpin a chat session (toggle).

	Returns:
		dict: {"is_pinned": bool}
	"""
	user = frappe.session.user
	session_user = frappe.db.get_value("AI Chat Session", session_name, "user")
	if not session_user:
		frappe.throw(_("Chat session not found"))
	if session_user != user and user != "Administrator":
		if not _is_shared_with(session_name, user):
			frappe.throw(_("Access denied"))

	current = frappe.db.get_value("AI Chat Session", session_name, "is_pinned") or 0
	new_val = 0 if current else 1
	frappe.db.set_value("AI Chat Session", session_name, "is_pinned", new_val)
	frappe.db.commit()
	return {"is_pinned": bool(new_val)}


@frappe.whitelist()
def search_messages(query, limit=20):
	"""Search across all user's chat messages.

	Args:
		query: Search string
		limit: Max results (default 20)

	Returns:
		list: [{"session_name", "session_title", "role", "content_preview", "creation"}]
	"""
	user = frappe.session.user
	if not query or len(query.strip()) < 2:
		return []

	q = f"%{query.strip()}%"

	# Get sessions the user owns or has access to
	shared_names = frappe.db.sql(
		"""SELECT parent FROM `tabAI Chat Shared User`
		WHERE user=%s AND parenttype='AI Chat Session'""",
		user, as_list=True,
	)
	shared_names = [r[0] for r in shared_names]

	if shared_names:
		results = frappe.db.sql(
			"""SELECT m.parent as session_name, s.title as session_title,
			          m.role, m.content, m.creation
			FROM `tabAI Chat Message` m
			JOIN `tabAI Chat Session` s ON s.name = m.parent
			WHERE (s.user = %s OR m.parent IN %s)
			AND m.content LIKE %s
			ORDER BY m.creation DESC
			LIMIT %s""",
			(user, shared_names, q, int(limit)),
			as_dict=True,
		)
	else:
		results = frappe.db.sql(
			"""SELECT m.parent as session_name, s.title as session_title,
			          m.role, m.content, m.creation
			FROM `tabAI Chat Message` m
			JOIN `tabAI Chat Session` s ON s.name = m.parent
			WHERE s.user = %s
			AND m.content LIKE %s
			ORDER BY m.creation DESC
			LIMIT %s""",
			(user, q, int(limit)),
			as_dict=True,
		)

	# Truncate content to preview
	for r in results:
		if r.content and len(r.content) > 120:
			r["content_preview"] = r.content[:120] + "..."
		else:
			r["content_preview"] = r.content or ""
		del r["content"]

	return results


# ─── Image Generation ─────────────────────────────────────────

# Patterns that indicate the user wants to generate an image
_IMAGE_GEN_PATTERNS = [
	r"\b(generate|create|make|draw|design|produce|render)\b.*\b(image|picture|photo|illustration|artwork|logo|icon|banner|poster|graphic|diagram|visual)\b",
	r"\b(image|picture|photo|illustration|artwork|logo|icon|banner|poster|graphic)\b.*\b(of|for|showing|depicting|with)\b",
	r"^(generate|create|make|draw|design|render)\b",
	r"\b(generate|create|make|design|draw|render)\s+(the\s+)?(image|logo|banner|poster|art|artwork|illustration)\b",
	r"\bdall[\s\-]?e\b",
]
_IMAGE_GEN_RE = re.compile("|".join(_IMAGE_GEN_PATTERNS), re.IGNORECASE)


def _is_model_unavailable_error(exc):
	"""Return True if exception indicates invalid/inaccessible model."""
	msg = str(exc).lower()
	if "model" not in msg:
		return False
	error_hints = [
		"does not exist",
		"do not have access",
		"not found",
		"invalid model",
		"unknown model",
		"not a chat model",
		"not supported",
		"did you mean",
		"decommissioned",
		"deprecated",
	]
	return any(h in msg for h in error_hints)


def _get_fallback_model(requested_model, settings):
	"""Pick a fallback model when requested model is unavailable."""
	fallback = settings.default_model or "gpt-4o-mini"
	if fallback == requested_model:
		return None
	return fallback


@frappe.whitelist()
def get_model_catalog():
	"""Return chat-capable models available for the configured provider/key.

	Used by Ask AI frontend to avoid listing models that won't work.
	"""
	settings = frappe.get_cached_doc("AI Settings")
	provider = settings.provider_type
	default_model = settings.default_model or "gpt-4o-mini"

	def _label_for_model(model_id):
		"""Generate a human-friendly label from model ID."""
		label = model_id.replace("-", " ").replace(".", ".").title()
		# Fix common casing: GPT, Pro, Mini, Nano
		label = label.replace("Gpt", "GPT").replace("Gpt", "GPT")
		label = label.replace(" Chat Latest", " (Chat Latest)")
		# Fix o-series models
		for prefix in ("O1", "O3", "O4"):
			if label.startswith(prefix.title()):
				label = prefix + label[len(prefix):]
		return label

	def _is_chat_model(model_id):
		mid = (model_id or "").lower()
		# Exclude non-chat model types
		if any(x in mid for x in [
			"embedding", "tts", "whisper", "moderation", "image", "dall-e",
			"audio", "realtime", "codex", "transcribe", "diarize",
			"search", "deep-research", "deep_research", "instruct",
		]):
			return False
		# Exclude dated snapshot variants (e.g. gpt-5-2025-08-07, o1-2024-12-17)
		import re as _re
		if _re.search(r'\d{4}[-_]\d{2}[-_]\d{2}', mid):
			return False
		# Exclude *-pro models from GPT-5 family (v1/responses only, not chat)
		if mid.startswith("gpt-5") and "-pro" in mid:
			return False
		return any(mid.startswith(p) for p in [
			"gpt", "o1", "o3", "o4", "claude", "gemini", "deepseek", "grok", "llama", "mistral", "qwen"
		])

	try:
		import requests
		api_key = settings.get_password("api_key")
		base_url = settings.get_base_url().rstrip("/")

		if not api_key:
			raise Exception("API key not configured")

		models = []
		if provider in ("OpenAI", "Custom (OpenAI Compatible)"):
			resp = requests.get(
				f"{base_url}/models",
				headers={"Authorization": f"Bearer {api_key}"},
				timeout=20,
			)
			resp.raise_for_status()
			data = resp.json().get("data", [])
			models = sorted({m.get("id") for m in data if m.get("id") and _is_chat_model(m.get("id"))})

		elif provider == "Anthropic":
			# Anthropic model listing endpoint
			resp = requests.get(
				f"{base_url}/models",
				headers={"x-api-key": api_key, "anthropic-version": "2023-06-01"},
				timeout=20,
			)
			resp.raise_for_status()
			data = resp.json().get("data", [])
			models = sorted({m.get("id") for m in data if m.get("id") and _is_chat_model(m.get("id"))})

		if default_model not in models:
			models.insert(0, default_model)

		preferred = [
			"gpt-4o-mini", "gpt-4o", "gpt-5", "gpt-5-chat-latest", "gpt-5.2", "gpt-5.2-chat-latest",
			"o4-mini", "o3-mini", "o3", "o1-mini", "o1",
		]

		def _sort_key(mid):
			if mid in preferred:
				return (0, preferred.index(mid))
			return (1, mid)

		models = sorted(dict.fromkeys(models), key=_sort_key)

		return {
			"provider_type": provider,
			"default_model": default_model,
			"models": [{"value": m, "label": _label_for_model(m)} for m in models],
		}

	except Exception:
		# Safe fallback: keep UI functional with default model only
		return {
			"provider_type": provider,
			"default_model": default_model,
			"models": [{"value": default_model, "label": _label_for_model(default_model)}],
		}


def _is_image_request(message):
	"""Detect if the user's message is asking to generate an image."""
	return bool(_IMAGE_GEN_RE.search(message))


def _save_generated_image(image_url, prompt, user):
	"""Download a generated image from URL and save it as a Frappe File."""
	import requests as req
	try:
		resp = req.get(image_url, timeout=60)
		resp.raise_for_status()

		# Generate a safe filename
		slug = re.sub(r'[^a-zA-Z0-9]+', '_', prompt[:40]).strip('_').lower()
		filename = f"ai_generated_{slug}_{int(time.time())}.png"

		# Save as Frappe File
		file_doc = frappe.get_doc({
			"doctype": "File",
			"file_name": filename,
			"content": resp.content,
			"is_private": 0,
			"folder": "Home",
		})
		file_doc.flags.ignore_permissions = True
		file_doc.save()
		frappe.db.commit()
		return file_doc.file_url
	except Exception:
		# If saving fails, return the original URL (temporary, expires in ~1hr)
		return image_url


def _sanitize_image_prompt(prompt, settings):
	"""Rewrite the user's image prompt to avoid DALL-E safety filter rejections.

	Runs the prompt through GPT to strip brand names, trademarked terms,
	and anything that might trigger OpenAI's content filter, while preserving
	the artistic intent.
	"""
	try:
		provider = LLMProvider(settings)
		result = provider.chat(
			messages=[
				{"role": "system", "content": (
					"You are an image prompt rewriter. Given a user's image generation prompt, "
					"rewrite it to be safe for DALL-E 3. Rules:\n"
					"1. Remove ALL brand names, company names, software names (ERPNext, SAP, Salesforce, etc.)\n"
					"2. Replace them with generic descriptions (e.g. 'ERPNext modules' → 'business software modules')\n"
					"3. Remove any names of real people or organizations\n"
					"4. Keep the artistic style, colors, composition, and mood intact\n"
					"5. Return ONLY the rewritten prompt, nothing else — no quotes, no explanation"
				)},
				{"role": "user", "content": prompt},
			],
			model="gpt-4o-mini",
			max_tokens=300,
			temperature=0.3,
		)
		sanitized = (result.get("content") or "").strip()
		return sanitized if sanitized else prompt
	except Exception:
		# If sanitization fails, use original prompt
		return prompt


def _generate_image_internal(session, prompt, user, settings, size="1024x1024", quality="standard"):
	"""Internal image generation — called from send_message auto-detect.

	Unlike generate_image(), this receives an already-loaded session
	and handles user message addition to avoid duplicates.
	"""
	# Add user message
	session.append("messages", {"role": "user", "content": prompt})

	start_time = time.time()

	provider = LLMProvider(settings)

	# Sanitize prompt to avoid DALL-E safety filter rejections
	safe_prompt = _sanitize_image_prompt(prompt, settings)

	result = provider.generate_image(
		prompt=safe_prompt,
		model="dall-e-3",
		size=size,
		quality=quality,
	)

	response_time = round(time.time() - start_time, 2)

	# Save image to Frappe files so it persists
	local_url = _save_generated_image(result["url"], prompt, user)

	# Estimate cost
	cost_map = {
		"standard": {"1024x1024": 0.04, "1024x1792": 0.08, "1792x1024": 0.08},
		"hd": {"1024x1024": 0.08, "1024x1792": 0.12, "1792x1024": 0.12},
	}
	estimated_cost = cost_map.get(quality, {}).get(size, 0.04)

	content = f"Here's the generated image:\n\n![Generated Image]({local_url})\n\n"
	if result.get("revised_prompt") and result["revised_prompt"] != prompt:
		content += f"*Refined prompt: {result['revised_prompt']}*"

	session.append("messages", {
		"role": "assistant",
		"content": content,
		"model": "dall-e-3",
		"cost": estimated_cost,
		"response_time": response_time,
	})

	session.total_cost = (session.total_cost or 0) + estimated_cost

	if session.title == "New Chat":
		session.title = prompt[:60] + ("..." if len(prompt) > 60 else "")

	session.flags.ignore_permissions = True
	session.save()
	frappe.db.commit()

	return {
		"content": content,
		"image_url": local_url,
		"revised_prompt": result.get("revised_prompt", prompt),
		"model": "dall-e-3",
		"cost": estimated_cost,
		"response_time": response_time,
		"type": "image",
		"session_title": session.title,
	}


@frappe.whitelist()
def generate_image(session_name, prompt, size="1024x1024", quality="standard"):
	"""Generate an image using DALL-E and add it to the chat session.

	Args:
		session_name: AI Chat Session name
		prompt: Text description of the image
		size: Image size (1024x1024, 1024x1792, 1792x1024)
		quality: standard or hd

	Returns:
		dict: {"content", "image_url", "revised_prompt", "model", "cost"}
	"""
	user = frappe.session.user

	# Verify ownership
	session_user = frappe.db.get_value("AI Chat Session", session_name, "user")
	if not session_user:
		frappe.throw(_("Chat session not found"), frappe.DoesNotExistError)
	if session_user != user and user != "Administrator":
		frappe.throw(_("Access denied"), frappe.PermissionError)

	settings = frappe.get_cached_doc("AI Settings")
	if not settings.is_configured():
		frappe.throw(_("AI is not configured. Please set up AI Settings."))

	allowed, reason = check_budget(user)
	if not allowed:
		frappe.throw(_(reason))

	session = frappe.get_doc("AI Chat Session", session_name)

	# Add user message
	session.append("messages", {"role": "user", "content": prompt})

	start_time = time.time()

	try:
		provider = LLMProvider(settings)

		# Sanitize prompt to avoid DALL-E safety filter rejections
		safe_prompt = _sanitize_image_prompt(prompt, settings)

		result = provider.generate_image(
			prompt=safe_prompt,
			model="dall-e-3",
			size=size,
			quality=quality,
		)

		response_time = round(time.time() - start_time, 2)

		# Save image to Frappe files so it persists
		local_url = _save_generated_image(result["url"], prompt, user)

		# Estimate cost (DALL-E 3: ~$0.04 standard, ~$0.08 HD for 1024x1024)
		cost_map = {
			"standard": {"1024x1024": 0.04, "1024x1792": 0.08, "1792x1024": 0.08},
			"hd": {"1024x1024": 0.08, "1024x1792": 0.12, "1792x1024": 0.12},
		}
		estimated_cost = cost_map.get(quality, {}).get(size, 0.04)

		# Build response content
		content = f"Here's the generated image:\n\n![Generated Image]({local_url})\n\n"
		if result.get("revised_prompt") and result["revised_prompt"] != prompt:
			content += f"*Refined prompt: {result['revised_prompt']}*"

		# Add AI response to session
		session.append("messages", {
			"role": "assistant",
			"content": content,
			"model": "dall-e-3",
			"cost": estimated_cost,
			"response_time": response_time,
		})

		session.total_cost = (session.total_cost or 0) + estimated_cost

		if session.title == "New Chat":
			session.title = prompt[:60] + ("..." if len(prompt) > 60 else "")

		session.flags.ignore_permissions = True
		session.save()
		frappe.db.commit()

		return {
			"content": content,
			"image_url": local_url,
			"revised_prompt": result.get("revised_prompt", prompt),
			"model": "dall-e-3",
			"cost": estimated_cost,
			"response_time": response_time,
			"type": "image",
			"session_title": session.title,
		}

	except Exception as e:
		session.flags.ignore_permissions = True
		session.save()
		frappe.db.commit()
		raise


# ─── Sharing Helpers ────────────────────────────────────────────

def _is_shared_with(session_name, user):
	"""Check if a session is shared with a user."""
	return frappe.db.exists("AI Chat Shared User", {
		"parent": session_name,
		"parenttype": "AI Chat Session",
		"user": user,
	})


def _verify_owner(session_name, user):
	"""Verify the current user is the session owner. Throws on failure."""
	session_user = frappe.db.get_value("AI Chat Session", session_name, "user")
	if not session_user:
		frappe.throw(_("Chat session not found"), frappe.DoesNotExistError)
	if session_user != user and user != "Administrator":
		frappe.throw(_("Only the session owner can manage sharing"), frappe.PermissionError)


@frappe.whitelist()
def share_session(session_name, users):
	"""Share a chat session with one or more users.

	Args:
		session_name: AI Chat Session name
		users: JSON-encoded list of user emails, or a single email string

	Returns:
		dict: {"success": True, "shared_with": [...]}
	"""
	import json as _json

	user = frappe.session.user
	_verify_owner(session_name, user)

	if isinstance(users, str):
		try:
			users = _json.loads(users)
		except (ValueError, TypeError):
			users = [users]

	if not isinstance(users, list) or not users:
		frappe.throw(_("Please provide at least one user to share with"))

	session = frappe.get_doc("AI Chat Session", session_name)
	existing = {row.user for row in (session.shared_with or [])}

	added = []
	for u in users:
		u = u.strip()
		if not u or u == user:
			continue
		if u in existing:
			continue
		if not frappe.db.exists("User", u):
			continue
		session.append("shared_with", {
			"user": u,
			"full_name": frappe.db.get_value("User", u, "full_name") or u,
			"shared_at": frappe.utils.now_datetime(),
		})
		added.append(u)

	if added:
		session.flags.ignore_permissions = True
		session.save()
		frappe.db.commit()

	return {
		"success": True,
		"added": added,
		"shared_with": [{"user": r.user, "full_name": r.full_name} for r in session.shared_with],
	}


@frappe.whitelist()
def unshare_session(session_name, unshare_user):
	"""Remove sharing for a specific user.

	Args:
		session_name: AI Chat Session name
		unshare_user: User email to remove

	Returns:
		dict: {"success": True}
	"""
	user = frappe.session.user
	_verify_owner(session_name, user)

	session = frappe.get_doc("AI Chat Session", session_name)
	session.shared_with = [r for r in (session.shared_with or []) if r.user != unshare_user]
	session.flags.ignore_permissions = True
	session.save()
	frappe.db.commit()

	return {"success": True}


@frappe.whitelist()
def get_shared_users(session_name):
	"""Get list of users a session is shared with.

	Returns:
		list: [{"user", "full_name", "shared_at"}]
	"""
	user = frappe.session.user
	session_user = frappe.db.get_value("AI Chat Session", session_name, "user")
	if not session_user:
		frappe.throw(_("Chat session not found"), frappe.DoesNotExistError)
	if session_user != user and user != "Administrator":
		frappe.throw(_("Access denied"), frappe.PermissionError)

	rows = frappe.db.sql(
		"""SELECT user, full_name, shared_at
		FROM `tabAI Chat Shared User`
		WHERE parent=%s AND parenttype='AI Chat Session'
		ORDER BY shared_at ASC""",
		session_name,
		as_dict=True,
	)
	return rows


# ─── @ Mention Context — DocType Schema Injection ────


@frappe.whitelist()
def get_doctype_suggestions(query=""):
	"""Search for DocTypes matching a query string, for @mention autocomplete.

	Args:
		query: partial doctype name to search

	Returns:
		list: [{"name": "Sales Invoice", "module": "Accounts"}, ...]
	"""
	query = (query or "").strip()
	if len(query) < 1:
		return []

	results = frappe.get_all(
		"DocType",
		filters={
			"name": ["like", f"%{query}%"],
			"istable": 0,
			"issingle": 0,
		},
		fields=["name", "module"],
		order_by="name asc",
		limit_page_length=15,
	)
	return results


@frappe.whitelist()
def get_document_suggestions(doctype, query=""):
	"""Search for specific documents within a DocType, for @mention autocomplete.

	Args:
		doctype: the DocType to search within
		query: partial document name to search

	Returns:
		list: [{"name": "INV-00001", "title": "..."}, ...]
	"""
	if not doctype or not frappe.db.exists("DocType", doctype):
		return []

	query = (query or "").strip()
	meta = frappe.get_meta(doctype)

	# Determine the title field for display
	title_field = meta.title_field or "name"
	fields = ["name"]
	if title_field != "name" and meta.has_field(title_field):
		fields.append(title_field)

	filters = {}
	if query:
		or_filters = {"name": ["like", f"%{query}%"]}
		if title_field != "name" and meta.has_field(title_field):
			or_filters[title_field] = ["like", f"%{query}%"]
		# Use or_filters for name/title search
		results = frappe.get_all(
			doctype,
			or_filters=or_filters,
			fields=fields,
			order_by="modified desc",
			limit_page_length=15,
		)
	else:
		results = frappe.get_all(
			doctype,
			fields=fields,
			order_by="modified desc",
			limit_page_length=15,
		)

	# Normalize output
	out = []
	for r in results:
		title = r.get(title_field) if title_field != "name" else ""
		out.append({"name": r.name, "title": title or ""})
	return out


def _build_doctype_context(doctype_names):
	"""Build a schema context string for the given doctype names.

	Returns a formatted string describing the fields of each doctype,
	suitable for injection into the system prompt.
	"""
	if not doctype_names:
		return ""

	parts = []
	for dt_name in doctype_names[:5]:  # max 5 doctypes to avoid token bloat
		if not frappe.db.exists("DocType", dt_name):
			continue
		meta = frappe.get_meta(dt_name)
		fields_info = []
		for f in meta.fields:
			if f.fieldtype in ("Section Break", "Column Break", "Tab Break", "HTML", "Fold"):
				continue
			info = f"{f.fieldname} ({f.fieldtype}"
			if f.options:
				info += f", options={f.options}"
			if f.reqd:
				info += ", required"
			info += ")"
			if f.label:
				info = f"{f.label}: {info}"
			fields_info.append(info)

		# Include child tables
		child_tables = []
		for f in meta.fields:
			if f.fieldtype == "Table" and f.options:
				child_meta = frappe.get_meta(f.options)
				child_fields = []
				for cf in child_meta.fields:
					if cf.fieldtype in ("Section Break", "Column Break", "Tab Break", "HTML", "Fold"):
						continue
					ci = f"{cf.fieldname} ({cf.fieldtype}"
					if cf.options:
						ci += f", options={cf.options}"
					ci += ")"
					if cf.label:
						ci = f"{cf.label}: {ci}"
					child_fields.append(ci)
				child_tables.append(f"  Child Table '{f.options}' (via field '{f.fieldname}'):\n    " + "\n    ".join(child_fields[:30]))

		dt_section = f"### {dt_name} (module: {meta.module})\n"
		dt_section += f"Fields:\n  " + "\n  ".join(fields_info[:50])
		if child_tables:
			dt_section += "\n\n" + "\n\n".join(child_tables)

		# Record count for context
		try:
			count = frappe.db.count(dt_name)
			dt_section += f"\n\nTotal records: {count}"
		except Exception:
			pass

		parts.append(dt_section)

	if not parts:
		return ""

	return "The user referenced these ERPNext DocTypes. Use their exact field names and structure in your response:\n\n" + "\n\n---\n\n".join(parts)


def _build_specific_document_context(doc_mentions):
	"""Build context containing actual document data for specific @DocType:DocName mentions.

	Args:
		doc_mentions: list of (doctype, docname) tuples

	Returns:
		str: formatted context string with document field values
	"""
	if not doc_mentions:
		return ""

	parts = []
	seen = set()
	for dt_name, doc_name in doc_mentions[:5]:  # max 5 docs
		key = f"{dt_name}:{doc_name}"
		if key in seen:
			continue
		seen.add(key)

		try:
			doc = frappe.get_doc(dt_name, doc_name)
			meta = frappe.get_meta(dt_name)

			# Build field values (skip layout fields and empty values)
			field_lines = [f"**{dt_name}: {doc_name}**"]
			for f in meta.fields:
				if f.fieldtype in ("Section Break", "Column Break", "Tab Break", "HTML", "Fold", "Table"):
					continue
				val = doc.get(f.fieldname)
				if val is not None and val != "" and val != 0:
					label = f.label or f.fieldname
					field_lines.append(f"  {label}: {val}")

			# Include key standard fields
			for sf in ["creation", "modified", "owner", "docstatus"]:
				val = doc.get(sf)
				if val:
					field_lines.append(f"  {sf}: {val}")

			# Include child table rows (summarized)
			for f in meta.fields:
				if f.fieldtype == "Table" and f.options:
					rows = doc.get(f.fieldname) or []
					if rows:
						child_meta = frappe.get_meta(f.options)
						child_fields = [cf for cf in child_meta.fields if cf.fieldtype not in ("Section Break", "Column Break", "Tab Break", "HTML", "Fold")][:10]
						field_lines.append(f"\n  Child table '{f.fieldname}' ({len(rows)} rows):")
						for i, row in enumerate(rows[:20]):  # max 20 child rows
							row_vals = []
							for cf in child_fields:
								rv = row.get(cf.fieldname)
								if rv is not None and rv != "" and rv != 0:
									row_vals.append(f"{cf.label or cf.fieldname}={rv}")
							if row_vals:
								field_lines.append(f"    Row {i+1}: " + ", ".join(row_vals))

			parts.append("\n".join(field_lines))
		except Exception:
			pass

	if not parts:
		return ""

	return "The user referenced these specific documents. Here is their actual data:\n\n" + "\n\n---\n\n".join(parts)


def _extract_doctype_mentions(message):
	"""Extract @DocType and @DocType:DocName mentions from a message string.

	Supports: @Sales Invoice, @Employee, @"Sales Invoice", @`Sales Invoice`
	          @Sales Invoice:INV-001, @"Sales Invoice":INV-001

	Returns:
		tuple: (list of doctype-only names, list of (doctype, docname) tuples)
	"""
	doctype_only = set()
	specific_docs = []

	# Quoted mentions with specific doc: @"Sales Invoice":INV-001 or @`Sales Invoice`:DocName
	for m in re.finditer(r'@["`]([^"`]+)["`]:([^\s,;]+)', message):
		dt = m.group(1).strip()
		dn = m.group(2).strip()
		if frappe.db.exists("DocType", dt) and frappe.db.exists(dt, dn):
			specific_docs.append((dt, dn))

	# Unquoted mentions with specific doc: @Sales Invoice:INV-001
	for m in re.finditer(r'@([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,4}):([^\s,;]+)', message):
		dt = m.group(1).strip()
		dn = m.group(2).strip()
		if frappe.db.exists("DocType", dt) and frappe.db.exists(dt, dn):
			specific_docs.append((dt, dn))

	# Quoted mentions (schema only): @"Sales Invoice" or @`Sales Invoice` (not followed by :)
	for m in re.finditer(r'@["`]([^"`]+)["`](?!:)', message):
		dt = m.group(1).strip()
		if frappe.db.exists("DocType", dt):
			doctype_only.add(dt)

	# Unquoted mentions (schema only): @Employee or @Sales Invoice (not followed by :)
	for m in re.finditer(r'@([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,4})\b(?!:)', message):
		dt = m.group(1).strip()
		if frappe.db.exists("DocType", dt):
			doctype_only.add(dt)

	# Remove doctypes that already appear in specific_docs
	specific_doctypes = {dt for dt, _ in specific_docs}
	doctype_only -= specific_doctypes

	return list(doctype_only), specific_docs
