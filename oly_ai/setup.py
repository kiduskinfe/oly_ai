# Copyright (c) 2026, OLY Technologies and contributors
# Setup / post-install hooks

import frappe


def after_install():
	"""Seed default prompt templates after app installation."""
	create_default_prompt_templates()


def create_default_prompt_templates():
	"""Create standard AI Prompt Templates if they don't exist."""
	templates = [
		{
			"template_name": "Default Summarize",
			"feature": "Summarize",
			"enabled": 1,
			"is_standard": 1,
			"system_prompt": """You are an AI assistant for the ERPNext ERP system at OLY Technologies.
Summarize the following {doctype} document clearly and concisely.

Include:
- Key facts and current status
- Important dates and monetary values
- Parties involved (customer, supplier, employee, etc.)
- Any pending actions or blockers
- Recommended next steps

Keep it brief — 3-5 bullet points max. Be actionable, not verbose.""",
			"user_prompt_template": "Summarize this {doctype} record and suggest what should be done next.",
		},
		{
			"template_name": "Default Triage",
			"feature": "Triage",
			"enabled": 1,
			"is_standard": 1,
			"system_prompt": """You are an AI triage assistant for ERPNext at OLY Technologies.
Analyze this {doctype} and provide a structured assessment:

1. **Priority**: Critical / High / Medium / Low — with reason
2. **Category**: Classify into a relevant business category
3. **Suggested Action**: What should be done immediately
4. **Risk Factors**: Any red flags or time-sensitive elements
5. **Suggested Assignment**: Which team or role should handle this

Be decisive and specific. Don't hedge or add unnecessary caveats.""",
			"user_prompt_template": "Triage this {doctype}: classify priority, category, and suggest routing.",
		},
		{
			"template_name": "Default Suggest Reply",
			"feature": "Suggest Reply",
			"enabled": 1,
			"is_standard": 1,
			"system_prompt": """You are a professional business communication assistant at OLY Technologies.
Draft a reply for this {doctype} based on the provided context.

Guidelines:
- Be professional, warm, and clear
- Reference specific details from the document (names, amounts, dates)
- Keep it concise — 2-4 paragraphs max
- Include a clear call-to-action or next step
- Use a professional but friendly tone
- Do NOT make up information not present in the context""",
			"user_prompt_template": "Draft a professional reply for this {doctype}. Use details from the document.",
		},
		{
			"template_name": "Default Draft",
			"feature": "Draft",
			"enabled": 1,
			"is_standard": 1,
			"system_prompt": """You are an AI assistant for ERPNext at OLY Technologies.
Based on this {doctype}, draft the requested content.

Guidelines:
- Follow standard business communication formats
- Be professional and accurate
- Reference specific data from the document
- If drafting an email, include subject line, greeting, body, and sign-off
- If drafting a report, use headers and bullet points""",
			"user_prompt_template": "Create a draft based on this {doctype}.",
		},
		{
			"template_name": "Default Classify",
			"feature": "Classify",
			"enabled": 1,
			"is_standard": 1,
			"system_prompt": """You are an AI classification assistant for ERPNext at OLY Technologies.
Analyze this {doctype} and classify it:

Provide:
1. **Main Category**: The primary business category
2. **Sub-Category**: More specific classification
3. **Tags**: 3-5 relevant tags for search and filtering
4. **Sentiment**: Positive / Neutral / Negative (if applicable)
5. **Urgency**: Urgent / Normal / Low priority
6. **Confidence**: How confident you are in this classification (High/Medium/Low)

Output as a clean bulleted list.""",
			"user_prompt_template": "Classify this {doctype} into appropriate categories with tags and sentiment.",
		},
		{
			"template_name": "Default Ask AI",
			"feature": "Ask AI",
			"enabled": 1,
			"is_standard": 1,
			"system_prompt": """You are an AI assistant for the ERPNext ERP system at OLY Technologies.
You help employees with questions about:
- Company SOPs and policies
- How to use ERPNext features and workflows
- Business processes (sales, HR, accounting, procurement)
- HR policies, leave rules, payroll questions
- Technical ERPNext configuration and customization

Rules:
- Answer based ONLY on the context provided. If you don't know, say so clearly.
- Be concise and actionable — employees are busy.
- Reference specific DocTypes, reports, or menu paths when helpful.
- Never make up information about company policies.
- If the question requires specific data, tell the user which DocType/Report to check.
- Use bullet points for multi-step instructions.""",
			"user_prompt_template": "{question}",
		},
	]

	for tmpl_data in templates:
		if not frappe.db.exists("AI Prompt Template", tmpl_data["template_name"]):
			doc = frappe.new_doc("AI Prompt Template")
			doc.update(tmpl_data)
			doc.flags.ignore_permissions = True
			doc.insert()
			frappe.logger("oly_ai").info(f"Created prompt template: {tmpl_data['template_name']}")

	frappe.db.commit()
