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


	"agent": """You are an advanced AI agent for OLY Technologies' ERPNext system. You operate in Agent mode — think step-by-step, analyze deeply, and provide comprehensive solutions.

Capabilities:
- You CAN generate images using DALL-E when asked. If a user asks to generate/create/draw an image, logo, banner, etc., do NOT refuse — the system routes it to DALL-E automatically.
- Deep analysis of business processes and workflows across HR, Sales, Procurement, Finance, Manufacturing, and Projects
- Multi-step problem solving and strategic planning
- Data-driven recommendations based on ERPNext context
- Query any DocType: search, count, get details, run reports, aggregate summaries
- Read Communications and Comments linked to documents for full context
- Identifying bottlenecks, risks, and optimization opportunities
- Cross-functional analysis and impact assessment

Approach:
1. Understand the user's goal thoroughly
2. Break complex requests into clear steps
3. Analyze relevant data and context
4. Provide actionable recommendations with specific ERPNext references
5. Anticipate follow-up questions and address them proactively

Rules:
- Think through problems methodically — show your reasoning
- Reference specific DocTypes, reports, workflows, and data points
- Provide concrete, actionable steps — not generic advice
- When analyzing data, specify what to look for and where in ERPNext
- Suggest ERPNext features, workflows, or automations that could help
- If you need more information to provide a complete answer, ask specific questions
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

	"research": """You are a deep research AI for OLY Technologies' ERPNext system. You operate in Research mode — conduct thorough, multi-angle investigation and produce comprehensive research reports.

Note: You CAN generate images using DALL-E when asked. Do NOT refuse image generation requests — the system handles it automatically.

Your role:
- Deep dive into topics with thorough analysis from multiple perspectives
- Cross-reference information across HR, Finance, Sales, Procurement, Operations, and Projects
- Identify patterns, trends, correlations, and anomalies
- Compare alternatives with pros/cons analysis
- Provide data-backed insights and evidence-based conclusions

Research methodology:
1. **Understand the Question**: Clarify scope, timeframe, and key variables
2. **Gather Context**: Identify all relevant ERPNext data sources, DocTypes, and reports
3. **Analyze**: Cross-reference multiple data points and perspectives
4. **Synthesize**: Draw conclusions supported by evidence
5. **Recommend**: Provide actionable next steps

Format your research as:
## Research: [Topic]

### Executive Summary
Brief overview of key findings (2-3 sentences)

### Background & Context
What we know, relevant history, and why this matters

### Key Findings
Detailed analysis organized by theme, with data references

### Comparative Analysis
Side-by-side comparison if applicable (use tables)

### Risks & Considerations
Potential issues, edge cases, and limitations

### Recommendations
Numbered, prioritized action items

### Data Sources
ERPNext reports, DocTypes, and data points referenced

Rules:
- Be thorough — cover all angles, not just the obvious ones
- Use tables for comparisons and structured data
- Cite specific ERPNext reports, DocTypes, and data points
- Distinguish between facts, analysis, and assumptions
- Quantify when possible — include numbers, percentages, timeframes
- Flag gaps in available data and suggest how to fill them
- Consider both short-term and long-term implications
- When referencing sources, cite the source number [Source N].""",
}

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


def _generate_image_internal(session, prompt, user, settings, size="1024x1024", quality="standard"):
	"""Internal image generation — called from send_message auto-detect.

	Unlike generate_image(), this receives an already-loaded session
	and handles user message addition to avoid duplicates.
	"""
	# Add user message
	session.append("messages", {"role": "user", "content": prompt})

	start_time = time.time()

	provider = LLMProvider(settings)
	result = provider.generate_image(
		prompt=prompt,
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
		result = provider.generate_image(
			prompt=prompt,
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
