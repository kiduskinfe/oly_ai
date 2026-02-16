# Copyright (c) 2026, OLY Technologies and contributors
# Main AI Gateway — single entry point for all AI features
# All calls are permission-checked, budget-enforced, cached, and audit-logged.

import frappe
from frappe import _

from oly_ai.core.provider import LLMProvider
from oly_ai.core.cache import get_cached_response, set_cached_response
from oly_ai.core.cost_tracker import check_budget, track_usage, estimate_cost
from oly_ai.core.context import get_document_context, build_messages


def _log_audit(user, feature, doctype, name, model, prompt, response_text, tokens_in, tokens_out, cost, response_time, status, error="", cached=False):
	"""Create an audit log entry."""
	settings = frappe.get_cached_doc("AI Settings")
	if not settings.enable_audit_logging:
		return

	try:
		log = frappe.new_doc("AI Audit Log")
		log.user = user
		log.feature = feature
		log.reference_doctype = doctype
		log.reference_name = name
		log.model_used = model
		log.status = status
		log.tokens_input = tokens_in
		log.tokens_output = tokens_out
		log.estimated_cost_usd = cost
		log.response_time = response_time
		log.cached = cached

		if settings.log_prompts:
			log.prompt_text = prompt
		if settings.log_responses:
			log.response_text = response_text
		if error:
			log.error_message = error

		log.flags.ignore_permissions = True
		log.insert()
		frappe.db.commit()
	except Exception as e:
		frappe.logger("oly_ai").error(f"Failed to log audit: {e}")


@frappe.whitelist()
def ai_assist(doctype, name, feature, custom_prompt=None):
	"""Main AI gateway endpoint. Called from Desk UI.

	Args:
		doctype: Document type (Lead, Opportunity, Issue, etc.)
		name: Document name
		feature: AI feature (Summarize, Triage, Suggest Reply, Draft, Classify)
		custom_prompt: Optional custom user prompt

	Returns:
		dict: {"content": str, "model": str, "cached": bool, "cost": float}
	"""
	user = frappe.session.user

	# 0. Check AI is configured
	settings = frappe.get_cached_doc("AI Settings")
	if not settings.is_configured():
		frappe.throw(
			_("AI is not configured yet. Please go to {0} and set your API key.").format(
				'<a href="/app/ai-settings">AI Settings</a>'
			),
			title=_("AI Not Configured")
		)

	# 1. Permission check
	if not frappe.has_permission(doctype, "read", name):
		frappe.throw(_("You don't have permission to read this document"))

	# 2. Budget check
	allowed, reason = check_budget(user)
	if not allowed:
		_log_audit(user, feature, doctype, name, "", "", "", 0, 0, 0, 0, "Budget Exceeded")
		frappe.throw(_(reason))

	# 3. Build context from document
	context = get_document_context(doctype, name)

	# 4. Get prompt template (or use defaults)
	system_prompt, user_prompt = _get_prompts(feature, doctype, name, context, custom_prompt)
	messages = build_messages(system_prompt, user_prompt, context)

	# 5. Determine model
	model = settings.default_model
	template = _get_template(feature, doctype)
	if template and template.model_override:
		model = template.model_override

	# 6. Check cache
	cached_response = get_cached_response(messages, model, feature)
	if cached_response:
		_log_audit(user, feature, doctype, name, model, "", cached_response.get("content", ""), 0, 0, 0, 0, "Cached", cached=True)
		return {
			"content": cached_response.get("content", ""),
			"model": model,
			"cached": True,
			"cost": 0,
		}

	# 7. Call LLM
	try:
		provider = LLMProvider(settings)
		temperature = None
		max_tokens = None
		if template:
			temperature = template.temperature_override
			max_tokens = template.max_tokens_override

		result = provider.chat(messages, model=model, temperature=temperature, max_tokens=max_tokens)

		# 8. Track cost
		cost = track_usage(model, result["tokens_input"], result["tokens_output"], user)

		# 9. Cache response
		set_cached_response(messages, model, result, feature)

		# 10. Audit log
		_log_audit(
			user, feature, doctype, name, model,
			user_prompt, result["content"],
			result["tokens_input"], result["tokens_output"],
			cost, result["response_time"], "Success"
		)

		return {
			"content": result["content"],
			"model": result["model"],
			"cached": False,
			"cost": cost,
			"tokens": result["tokens_input"] + result["tokens_output"],
			"response_time": result["response_time"],
		}

	except Exception as e:
		_log_audit(user, feature, doctype, name, model, user_prompt, "", 0, 0, 0, 0, "Error", error=str(e))
		raise


@frappe.whitelist()
def ask_erp(question):
	"""Ask AI — general Q&A about the system, SOPs, policies.
	Enhanced with RAG: retrieves relevant indexed documents as context.

	Args:
		question: User's question in natural language

	Returns:
		dict: {"content": str, "model": str, "cached": bool, "cost": float, "sources": list}
	"""
	user = frappe.session.user

	# Check AI is configured
	settings = frappe.get_cached_doc("AI Settings")
	if not settings.is_configured():
		frappe.throw(
			_("AI is not configured yet. Please go to {0} and set your API key.").format(
				'<a href="/app/ai-settings">AI Settings</a>'
			),
			title=_("AI Not Configured")
		)

	# Budget check
	allowed, reason = check_budget(user)
	if not allowed:
		frappe.throw(_(reason))

	model = settings.default_model

	# Try RAG retrieval for relevant context
	rag_context = ""
	sources = []
	try:
		from oly_ai.core.rag.retriever import build_rag_context
		rag_context, sources = build_rag_context(question, top_k=5, min_score=0.7)
	except Exception:
		pass  # RAG is optional — if it fails, continue without it

	system_prompt = """You are an AI assistant for ERPNext ERP system at OLY Technologies.
You help employees with questions about:
- Company SOPs and policies
- How to use ERPNext features
- Business processes and workflows
- HR policies, leave rules, payroll questions
- Sales and procurement processes

Rules:
- Answer based ONLY on the context provided. If you don't know, say so.
- Be concise and actionable.
- Reference specific document names or processes when possible.
- Never make up information about company policies.
- If the question requires accessing specific data, tell the user which DocType/report to check.
- When referencing sources, cite the source number [Source N]."""

	if rag_context:
		user_prompt = f"Relevant company documents:\n\n{rag_context}\n\n---\n\nQuestion: {question}"
	else:
		user_prompt = f"Question: {question}"

	messages = build_messages(system_prompt, user_prompt)

	# Check cache
	cached = get_cached_response(messages, model, "Ask AI")
	if cached:
		_log_audit(user, "Ask AI", "", "", model, "", cached.get("content", ""), 0, 0, 0, 0, "Cached", cached=True)
		return {"content": cached.get("content", ""), "model": model, "cached": True, "cost": 0, "sources": sources}

	try:
		provider = LLMProvider(settings)
		result = provider.chat(messages, model=model)
		cost = track_usage(model, result["tokens_input"], result["tokens_output"], user)
		set_cached_response(messages, model, result, "Ask AI")
		_log_audit(user, "Ask AI", "", "", model, question, result["content"], result["tokens_input"], result["tokens_output"], cost, result["response_time"], "Success")

		return {
			"content": result["content"],
			"model": result["model"],
			"cached": False,
			"cost": cost,
			"sources": sources,
		}
	except Exception as e:
		_log_audit(user, "Ask AI", "", "", model, question, "", 0, 0, 0, 0, "Error", error=str(e))
		raise


@frappe.whitelist()
def get_ai_status():
	"""Get current AI status — budget, usage, provider info. For the settings dashboard."""
	settings = frappe.get_cached_doc("AI Settings")

	return {
		"provider": settings.provider_type,
		"model": settings.default_model,
		"monthly_budget": settings.monthly_budget_usd,
		"current_spend": settings.current_month_spend,
		"daily_limit": settings.daily_request_limit,
		"requests_today": settings.requests_today,
		"caching_enabled": settings.enable_caching,
	}


def _get_template(feature, doctype):
	"""Get the best matching AI Prompt Template."""
	from oly_ai.oly_ai.doctype.ai_prompt_template.ai_prompt_template import AIPromptTemplate
	return AIPromptTemplate.get_template(feature, doctype)


def _get_prompts(feature, doctype, name, context, custom_prompt=None):
	"""Get system + user prompts for a feature, from template or defaults."""
	template = _get_template(feature, doctype)

	if template:
		system_prompt = template.system_prompt.replace("{doctype}", doctype).replace("{name}", name)
		user_prompt = template.user_prompt_template.replace("{doctype}", doctype).replace("{name}", name)
		if custom_prompt:
			user_prompt += f"\n\nAdditional instructions: {custom_prompt}"
		return system_prompt, user_prompt

	# Default prompts per feature
	defaults = {
		"Summarize": {
			"system": f"You are an AI assistant for ERPNext. Summarize the following {doctype} document concisely. Include: key facts, current status, important dates, and recommended next steps. Be brief and actionable.",
			"user": f"Summarize this {doctype} record and suggest next steps.",
		},
		"Triage": {
			"system": f"You are an AI assistant for ERPNext. Analyze this {doctype} and provide: 1) Suggested priority (Critical/High/Medium/Low), 2) Category/classification, 3) Suggested assignment or routing, 4) Key risk factors. Be decisive and brief.",
			"user": f"Triage this {doctype}: classify priority, category, and suggest routing.",
		},
		"Suggest Reply": {
			"system": f"You are a professional business communication assistant. Draft a reply for this {doctype} based on the context. Be professional, clear, and concise. Include specific details from the document.",
			"user": f"Draft a professional reply for this {doctype}.",
		},
		"Draft": {
			"system": f"You are an AI assistant for ERPNext. Based on this {doctype}, draft the requested content. Follow company standards and be professional.",
			"user": custom_prompt or f"Create a draft based on this {doctype}.",
		},
		"Classify": {
			"system": f"You are an AI assistant for ERPNext. Classify this {doctype} into appropriate categories. Provide: main category, sub-category, tags, and confidence level.",
			"user": f"Classify this {doctype} into appropriate categories.",
		},
	}

	feature_defaults = defaults.get(feature, defaults["Summarize"])
	system_prompt = feature_defaults["system"]
	user_prompt = feature_defaults["user"]
	if custom_prompt and feature != "Draft":
		user_prompt += f"\n\nAdditional instructions: {custom_prompt}"

	return system_prompt, user_prompt
