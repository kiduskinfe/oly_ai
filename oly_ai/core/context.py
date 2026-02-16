# Copyright (c) 2026, OLY Technologies and contributors
# Context builder — extracts document data for AI prompts

import frappe
from frappe.utils import cstr


def get_document_context(doctype, name, fields=None, include_comms=True, include_comments=True, max_length=4000):
	"""Build a text context from a Frappe document for AI consumption.

	Args:
		doctype: DocType name
		name: document name
		fields: list of specific field names to include (None = all standard)
		include_comms: include linked Communications
		include_comments: include document Comments
		max_length: max character length for context

	Returns:
		str: formatted context text
	"""
	# Permission check
	if not frappe.has_permission(doctype, "read", name):
		frappe.throw(f"No permission to read {doctype} {name}")

	doc = frappe.get_doc(doctype, name)
	meta = frappe.get_meta(doctype)

	parts = []
	parts.append(f"# {doctype}: {name}")
	parts.append("")

	# Document fields
	if fields:
		field_list = [f.strip() for f in fields.split(",") if f.strip()] if isinstance(fields, str) else fields
	else:
		# Use all visible, non-internal fields
		field_list = [
			f.fieldname for f in meta.fields
			if f.fieldtype not in ("Section Break", "Column Break", "Tab Break", "HTML", "Image", "Attach", "Attach Image")
			and not f.fieldname.startswith("_")
			and f.fieldname not in ("amended_from", "naming_series")
		]

	for fieldname in field_list:
		value = doc.get(fieldname)
		if value is not None and cstr(value).strip():
			field_label = meta.get_label(fieldname) or fieldname
			parts.append(f"**{field_label}**: {cstr(value).strip()}")

	# Communications (emails, messages)
	if include_comms:
		comms = frappe.get_all(
			"Communication",
			filters={
				"reference_doctype": doctype,
				"reference_name": name,
				"communication_type": "Communication",
			},
			fields=["sender", "subject", "content", "creation", "communication_medium"],
			order_by="creation desc",
			limit=10,
		)
		if comms:
			parts.append("")
			parts.append("## Recent Communications")
			for comm in comms:
				date_str = comm.creation.strftime("%Y-%m-%d %H:%M") if comm.creation else ""
				subject = cstr(comm.subject).strip()
				# Strip HTML from content
				content = frappe.utils.strip_html_tags(cstr(comm.content))[:500]
				parts.append(f"- [{date_str}] {comm.sender}: {subject}")
				if content:
					parts.append(f"  {content}")

	# Comments
	if include_comments:
		comments = frappe.get_all(
			"Comment",
			filters={
				"reference_doctype": doctype,
				"reference_name": name,
				"comment_type": "Comment",
			},
			fields=["comment_by", "content", "creation"],
			order_by="creation desc",
			limit=10,
		)
		if comments:
			parts.append("")
			parts.append("## Comments")
			for comment in comments:
				date_str = comment.creation.strftime("%Y-%m-%d %H:%M") if comment.creation else ""
				content = frappe.utils.strip_html_tags(cstr(comment.content))[:300]
				parts.append(f"- [{date_str}] {comment.comment_by}: {content}")

	context = "\n".join(parts)

	# Trim to max length
	if len(context) > max_length:
		context = context[:max_length] + "\n\n[Context truncated...]"

	return context


def build_messages(system_prompt, user_prompt, context=""):
	"""Build the messages array for LLM chat."""
	messages = []

	if system_prompt:
		messages.append({"role": "system", "content": system_prompt})

	user_content = user_prompt
	if context:
		user_content = f"{context}\n\n---\n\n{user_prompt}"

	messages.append({"role": "user", "content": user_content})
	return messages
