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

	# Add user message to session
	session.append("messages", {"role": "user", "content": message})

	# Build conversation history for context (last 20 messages max)
	conversation = []
	for msg in session.messages[-20:]:
		conversation.append({"role": msg.role, "content": msg.content})

	# System prompt — varies by mode
	mode = mode or "ask"

	SYSTEM_PROMPTS = {
		"ask": """You are an AI assistant for ERPNext ERP system at OLY Technologies.
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
- When referencing sources, cite the source number [Source N].""",

		"agent": """You are an advanced AI agent for OLY Technologies' ERPNext system. You operate in Agent mode — think step-by-step, analyze deeply, and provide comprehensive solutions.

Capabilities:
- Deep analysis of business processes and workflows across HR, Sales, Procurement, Finance, Manufacturing, and Projects
- Multi-step problem solving and strategic planning
- Data-driven recommendations based on ERPNext context
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

		"execute": """You are an AI execution assistant for OLY Technologies' ERPNext system. You operate in Execute mode — generate precise, actionable execution plans for tasks in ERPNext.

Your role:
- Generate step-by-step execution plans for ERPNext actions
- Specify exact DocTypes, fields, values, and sequences
- Provide exact navigation paths (e.g., HR > Leave Application > New)
- Include validation rules and prerequisites
- Warn about potential impacts or dependencies

Format your responses as:
1. **Task Summary**: What will be done
2. **Prerequisites**: What needs to be in place first
3. **Steps**: Numbered steps with exact field values and navigation paths
4. **Verification**: How to confirm the action was successful
5. **Warnings**: Any risks or side effects

Rules:
- Be extremely precise — include exact field names, values, and DocTypes
- Always mention prerequisites and dependencies
- Warn about irreversible actions (Submit, Cancel, Delete)
- Suggest the most efficient path to accomplish the task
- If the task is risky, recommend a safer alternative first
- Include relevant API calls or URLs when helpful
- Format with clear headers, steps, and code blocks
- When referencing sources, cite the source number [Source N].""",

		"research": """You are a deep research AI for OLY Technologies' ERPNext system. You operate in Research mode — conduct thorough, multi-angle investigation and produce comprehensive research reports.

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

	# Auto-detect image generation requests
	if _is_image_request(message) and not parsed_files:
		try:
			# Route to image generation instead of chat
			img_result = generate_image(session_name, message)
			return img_result
		except Exception:
			# If image generation fails, fall through to normal chat
			# Reload session since generate_image may have modified it
			session.reload()
			pass

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


# ─── Image Generation ─────────────────────────────────────────

# Patterns that indicate the user wants to generate an image
_IMAGE_GEN_PATTERNS = [
	r"\b(generate|create|make|draw|design|produce|render)\b.*\b(image|picture|photo|illustration|artwork|logo|icon|banner|poster|graphic|diagram|visual)\b",
	r"\b(image|picture|photo|illustration|artwork|logo|icon|banner|poster|graphic)\b.*\b(of|for|showing|depicting|with)\b",
	r"^(generate|create|make|draw|design)\b",
]
_IMAGE_GEN_RE = re.compile("|".join(_IMAGE_GEN_PATTERNS), re.IGNORECASE)


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
