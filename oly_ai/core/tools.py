# Copyright (c) 2026, OLY Technologies and contributors
# AI Tools — Functions the AI can call to query and manipulate ERPNext data
# All functions respect Frappe permissions of the requesting user.

import json
import frappe
from frappe import _
from frappe.utils import cstr, flt, cint


# ─── Tool Definitions (OpenAI function calling format) ─────────

TOOL_DEFINITIONS = [
	{
		"type": "function",
		"function": {
			"name": "search_documents",
			"description": "Search for documents in ERPNext. Use this to find records like Sales Orders, Invoices, Employees, Customers, etc. Always respects user permissions.",
			"parameters": {
				"type": "object",
				"properties": {
					"doctype": {
						"type": "string",
						"description": "The ERPNext DocType to search, e.g. 'Sales Order', 'Customer', 'Employee', 'Leave Application'",
					},
					"filters": {
						"type": "object",
						"description": "Filter conditions as key-value pairs. Values can be simple (exact match) or arrays like ['>', 100] or ['like', '%keyword%'] or ['between', ['2026-01-01', '2026-12-31']]",
					},
					"fields": {
						"type": "array",
						"items": {"type": "string"},
						"description": "Fields to return. Default: ['name']. Use ['*'] for all fields.",
					},
					"order_by": {
						"type": "string",
						"description": "Sort order, e.g. 'creation desc', 'grand_total asc'",
					},
					"limit": {
						"type": "integer",
						"description": "Maximum records to return (1-100, default 20)",
					},
				},
				"required": ["doctype"],
			},
		},
	},
	{
		"type": "function",
		"function": {
			"name": "get_document",
			"description": "Get full details of a specific document by name. Use this when you know the exact document ID/name.",
			"parameters": {
				"type": "object",
				"properties": {
					"doctype": {
						"type": "string",
						"description": "The DocType, e.g. 'Sales Order'",
					},
					"name": {
						"type": "string",
						"description": "The document name/ID, e.g. 'SO-2026-00001'",
					},
					"fields": {
						"type": "array",
						"items": {"type": "string"},
						"description": "Specific fields to return. If omitted, returns all standard fields.",
					},
				},
				"required": ["doctype", "name"],
			},
		},
	},
	{
		"type": "function",
		"function": {
			"name": "count_documents",
			"description": "Count documents matching filters. Use this for analytics like 'how many open sales orders?'",
			"parameters": {
				"type": "object",
				"properties": {
					"doctype": {
						"type": "string",
						"description": "The DocType to count",
					},
					"filters": {
						"type": "object",
						"description": "Filter conditions",
					},
				},
				"required": ["doctype"],
			},
		},
	},
	{
		"type": "function",
		"function": {
			"name": "get_report",
			"description": "Run a built-in ERPNext report and get the results. Use for analytics, summaries, and data aggregation.",
			"parameters": {
				"type": "object",
				"properties": {
					"report_name": {
						"type": "string",
						"description": "The report name, e.g. 'General Ledger', 'Accounts Receivable', 'Employee Leave Balance'",
					},
					"filters": {
						"type": "object",
						"description": "Report filters, e.g. {'company': 'OLY Technologies', 'from_date': '2026-01-01'}",
					},
					"limit": {
						"type": "integer",
						"description": "Max results (default 20)",
					},
				},
				"required": ["report_name"],
			},
		},
	},
	{
		"type": "function",
		"function": {
			"name": "get_list_summary",
			"description": "Get an aggregated summary of documents — counts by status, totals, averages, etc. Great for dashboard-style queries.",
			"parameters": {
				"type": "object",
				"properties": {
					"doctype": {
						"type": "string",
						"description": "The DocType to summarize",
					},
					"group_by": {
						"type": "string",
						"description": "Field to group by, e.g. 'status', 'department', 'customer'",
					},
					"aggregate_field": {
						"type": "string",
						"description": "Field to sum/avg, e.g. 'grand_total', 'base_grand_total'",
					},
					"filters": {
						"type": "object",
						"description": "Filter conditions",
					},
				},
				"required": ["doctype", "group_by"],
			},
		},
	},
	{
		"type": "function",
		"function": {
			"name": "create_document",
			"description": "Create a new document in ERPNext. IMPORTANT: This creates an action request that must be approved by the user before execution.",
			"parameters": {
				"type": "object",
				"properties": {
					"doctype": {
						"type": "string",
						"description": "The DocType to create, e.g. 'Task', 'ToDo', 'Leave Application'",
					},
					"fields": {
						"type": "object",
						"description": "Field-value pairs for the new document",
					},
				},
				"required": ["doctype", "fields"],
			},
		},
	},
	{
		"type": "function",
		"function": {
			"name": "update_document",
			"description": "Update an existing document. IMPORTANT: This creates an action request that must be approved by the user before execution.",
			"parameters": {
				"type": "object",
				"properties": {
					"doctype": {
						"type": "string",
						"description": "The DocType to update",
					},
					"name": {
						"type": "string",
						"description": "The document name to update",
					},
					"fields": {
						"type": "object",
						"description": "Field-value pairs to update",
					},
				},
				"required": ["doctype", "name", "fields"],
			},
		},
	},
	{
		"type": "function",
		"function": {
			"name": "submit_document",
			"description": "Submit a document (changes docstatus to 1). Use for submitting Sales Orders, Purchase Orders, Journal Entries, Leave Applications, etc. IMPORTANT: This creates an action request that must be approved first.",
			"parameters": {
				"type": "object",
				"properties": {
					"doctype": {
						"type": "string",
						"description": "The DocType to submit, e.g. 'Sales Order', 'Leave Application'",
					},
					"name": {
						"type": "string",
						"description": "The document name/ID to submit",
					},
				},
				"required": ["doctype", "name"],
			},
		},
	},
	{
		"type": "function",
		"function": {
			"name": "cancel_document",
			"description": "Cancel a submitted document (changes docstatus to 2). WARNING: This may be irreversible. IMPORTANT: This creates an action request that must be approved first.",
			"parameters": {
				"type": "object",
				"properties": {
					"doctype": {
						"type": "string",
						"description": "The DocType to cancel",
					},
					"name": {
						"type": "string",
						"description": "The document name to cancel",
					},
				},
				"required": ["doctype", "name"],
			},
		},
	},
	{
		"type": "function",
		"function": {
			"name": "delete_document",
			"description": "Permanently delete a document. WARNING: This is irreversible. IMPORTANT: This creates an action request that must be approved first.",
			"parameters": {
				"type": "object",
				"properties": {
					"doctype": {
						"type": "string",
						"description": "The DocType to delete from",
					},
					"name": {
						"type": "string",
						"description": "The document name to delete",
					},
				},
				"required": ["doctype", "name"],
			},
		},
	},
	{
		"type": "function",
		"function": {
			"name": "send_communication",
			"description": "Send a reply or new message on behalf of the user — creates a Communication record and optionally sends email. Use this to reply to customer inquiries, supplier messages, internal discussions, or any document-linked communication. IMPORTANT: This creates an action request that must be approved first.",
			"parameters": {
				"type": "object",
				"properties": {
					"doctype": {
						"type": "string",
						"description": "The reference DocType this communication is about, e.g. 'Lead', 'Issue', 'Sales Order'",
					},
					"name": {
						"type": "string",
						"description": "The reference document name",
					},
					"subject": {
						"type": "string",
						"description": "Email/message subject line",
					},
					"content": {
						"type": "string",
						"description": "The message body (HTML or plain text)",
					},
					"recipients": {
						"type": "string",
						"description": "Comma-separated recipient email addresses",
					},
					"cc": {
						"type": "string",
						"description": "Comma-separated CC email addresses (optional)",
					},
					"send_email": {
						"type": "boolean",
						"description": "Whether to actually send the email (true) or just record the communication (false). Default: true",
					},
					"communication_type": {
						"type": "string",
						"description": "Type of communication: 'Communication' (email), 'Comment', 'Chat'. Default: 'Communication'",
						"enum": ["Communication", "Comment", "Chat"],
					},
				},
				"required": ["doctype", "name", "content"],
			},
		},
	},
	{
		"type": "function",
		"function": {
			"name": "add_comment",
			"description": "Add a comment to any document. Use this for internal notes, status updates, or annotations on any DocType record.",
			"parameters": {
				"type": "object",
				"properties": {
					"doctype": {
						"type": "string",
						"description": "The DocType to comment on",
					},
					"name": {
						"type": "string",
						"description": "The document name to comment on",
					},
					"comment": {
						"type": "string",
						"description": "The comment text",
					},
				},
				"required": ["doctype", "name", "comment"],
			},
		},
	},
	{
		"type": "function",
		"function": {
			"name": "web_search",
			"description": "Search the internet for current information. Use this when the user asks about recent events, external data, market info, competitor analysis, or anything not available in the ERP system. Returns top search results with titles, URLs, and snippets.",
			"parameters": {
				"type": "object",
				"properties": {
					"query": {
						"type": "string",
						"description": "The search query, e.g. 'latest Ethiopian tax rates 2026' or 'frappe framework v15 new features'",
					},
					"max_results": {
						"type": "integer",
						"description": "Number of results to return (1-10, default 5)",
					},
				},
				"required": ["query"],
			},
		},
	},
	{
		"type": "function",
		"function": {
			"name": "analyze_file",
			"description": "Read and analyze an uploaded file attachment. Supports PDF, Excel (.xlsx), CSV, Word (.docx), and text files. Use this when the user references an attached file or asks about file contents. Returns the extracted text content.",
			"parameters": {
				"type": "object",
				"properties": {
					"file_url": {
						"type": "string",
						"description": "The file URL path, e.g. '/files/report.pdf' or '/private/files/data.xlsx'",
					},
				},
				"required": ["file_url"],
			},
		},
	},
]

def execute_tool(tool_name, arguments, user=None):
	"""Execute a tool call and return the result.

	Args:
		tool_name: Name of the tool to execute
		arguments: Dict of arguments
		user: The user making the request (for permission checks)

	Returns:
		str: JSON-encoded result string for the LLM
	"""
	user = user or frappe.session.user

	tool_map = {
		"search_documents": _tool_search_documents,
		"get_document": _tool_get_document,
		"count_documents": _tool_count_documents,
		"get_report": _tool_get_report,
		"get_list_summary": _tool_get_list_summary,
		"create_document": _tool_create_document,
		"update_document": _tool_update_document,
		"submit_document": _tool_submit_document,
		"cancel_document": _tool_cancel_document,
		"delete_document": _tool_delete_document,
		"send_communication": _tool_send_communication,
		"add_comment": _tool_add_comment,
		"web_search": _tool_web_search,
		"analyze_file": _tool_analyze_file,
	}

	handler = tool_map.get(tool_name)
	if handler:
		try:
			result = handler(arguments, user)
			return json.dumps(result, default=str, ensure_ascii=False)
		except frappe.PermissionError:
			return json.dumps({"error": f"Permission denied: you don't have access to this data"})
		except frappe.DoesNotExistError:
			return json.dumps({"error": f"Document not found"})
		except Exception as e:
			return json.dumps({"error": str(e)})

	# Check custom tools
	try:
		result = _execute_custom_tool(tool_name, arguments, user)
		if result is not None:
			return json.dumps(result, default=str, ensure_ascii=False)
	except Exception as e:
		return json.dumps({"error": str(e)})

	return json.dumps({"error": f"Unknown tool: {tool_name}"})


def _tool_search_documents(args, user):
	"""Search for documents with permission checks."""
	doctype = args["doctype"]
	filters = args.get("filters", {})
	fields = args.get("fields", ["name"])
	order_by = args.get("order_by", "modified desc")
	limit = min(args.get("limit", 20), _get_max_records())

	# Permission check
	if not frappe.has_permission(doctype, "read", user=user):
		raise frappe.PermissionError

	results = frappe.get_list(
		doctype,
		filters=filters,
		fields=fields,
		order_by=order_by,
		limit_page_length=limit,
		user=user,
	)

	return {
		"doctype": doctype,
		"count": len(results),
		"data": results,
	}


def _tool_get_document(args, user):
	"""Get a single document with permission checks."""
	doctype = args["doctype"]
	name = args["name"]
	fields = args.get("fields")

	if not frappe.has_permission(doctype, "read", name, user=user):
		raise frappe.PermissionError

	doc = frappe.get_doc(doctype, name)
	meta = frappe.get_meta(doctype)

	if fields:
		data = {f: doc.get(f) for f in fields if doc.get(f) is not None}
	else:
		# Return all standard fields (exclude internal/system fields)
		skip_fields = {"doctype", "docstatus", "idx", "owner", "modified_by",
		               "creation", "modified", "_user_tags", "_comments",
		               "_assign", "_liked_by", "_seen"}
		data = {}
		for f in meta.fields:
			if (f.fieldtype not in ("Section Break", "Column Break", "Tab Break", "HTML", "Button")
				and f.fieldname not in skip_fields):
				val = doc.get(f.fieldname)
				if val is not None and cstr(val).strip():
					data[f.fieldname] = val

	data["name"] = doc.name
	data["doctype"] = doctype
	if hasattr(doc, "docstatus"):
		data["docstatus"] = doc.docstatus

	return {"document": data}


def _tool_count_documents(args, user):
	"""Count documents matching filters."""
	doctype = args["doctype"]
	filters = args.get("filters", {})

	if not frappe.has_permission(doctype, "read", user=user):
		raise frappe.PermissionError

	count = frappe.db.count(doctype, filters=filters)
	return {"doctype": doctype, "count": count, "filters": filters}


def _tool_get_report(args, user):
	"""Run a report with permission checks."""
	report_name = args["report_name"]
	filters = args.get("filters", {})
	limit = min(args.get("limit", 20), _get_max_records())

	# Check report exists and user has access
	if not frappe.db.exists("Report", report_name):
		return {"error": f"Report '{report_name}' not found"}

	report = frappe.get_doc("Report", report_name)
	if not frappe.has_permission(report.ref_doctype, "read", user=user):
		raise frappe.PermissionError

	try:
		from frappe.desk.query_report import run as run_report
		result = run_report(report_name, filters=filters, user=user)

		columns = [c.get("label", c.get("fieldname", "")) for c in result.get("columns", [])]
		rows = result.get("result", [])[:limit]

		# Convert to readable format
		data = []
		for row in rows:
			if isinstance(row, dict):
				data.append(row)
			elif isinstance(row, (list, tuple)):
				data.append(dict(zip(columns, row)))

		return {
			"report": report_name,
			"columns": columns,
			"row_count": len(data),
			"data": data,
		}
	except Exception as e:
		return {"error": f"Failed to run report: {str(e)}"}


def _validate_doctype_field(doctype, fieldname):
	"""Validate that a fieldname exists on the given DocType. Returns True if valid."""
	meta = frappe.get_meta(doctype)
	valid_fields = {f.fieldname for f in meta.fields}
	# Also allow standard fields
	valid_fields.update({"name", "owner", "creation", "modified", "modified_by", "docstatus"})
	return fieldname in valid_fields


# Allowlisted SQL comparison operators (case-insensitive match)
_ALLOWED_SQL_OPERATORS = {
	"=", "!=", "<>", ">", "<", ">=", "<=",
	"like", "not like", "in", "not in", "between", "is",
}


def _tool_get_list_summary(args, user):
	"""Get aggregated summary — counts/totals grouped by a field."""
	doctype = args["doctype"]
	group_by = args["group_by"]
	aggregate_field = args.get("aggregate_field")
	filters = args.get("filters", {})

	# Validate doctype exists
	if not frappe.db.exists("DocType", doctype):
		return {"error": f"DocType '{doctype}' does not exist."}

	if not frappe.has_permission(doctype, "read", user=user):
		raise frappe.PermissionError

	# Validate group_by field
	if not _validate_doctype_field(doctype, group_by):
		return {"error": f"Field '{group_by}' does not exist on {doctype}."}

	agg_expr = ""
	if aggregate_field:
		if not _validate_doctype_field(doctype, aggregate_field):
			return {"error": f"Field '{aggregate_field}' does not exist on {doctype}."}
		agg_expr = f", SUM(`{aggregate_field}`) as total, AVG(`{aggregate_field}`) as average"

	# Build filter conditions — validate every key and operator
	conditions = "WHERE 1=1"
	values = []
	for key, val in filters.items():
		if not _validate_doctype_field(doctype, key):
			return {"error": f"Filter field '{key}' does not exist on {doctype}."}
		if isinstance(val, list) and len(val) == 2:
			operator = str(val[0]).strip().lower()
			if operator not in _ALLOWED_SQL_OPERATORS:
				return {"error": f"SQL operator '{val[0]}' is not allowed."}
			conditions += f" AND `{key}` {operator} %s"
			values.append(val[1])
		else:
			conditions += f" AND `{key}` = %s"
			values.append(val)

	sql = f"""
		SELECT `{group_by}` as group_value, COUNT(*) as count {agg_expr}
		FROM `tab{doctype}`
		{conditions}
		GROUP BY `{group_by}`
		ORDER BY count DESC
		LIMIT 50
	"""

	results = frappe.db.sql(sql, values, as_dict=True)
	return {
		"doctype": doctype,
		"grouped_by": group_by,
		"summary": results,
	}


def _tool_create_document(args, user):
	"""Create an action request for document creation (requires approval)."""
	doctype = args["doctype"]
	fields = args.get("fields", {})

	settings = frappe.get_cached_doc("AI Settings")

	if not settings.enable_execute_mode:
		return {"error": "Execute mode is not enabled. Ask your admin to enable it in AI Settings."}

	if not frappe.has_permission(doctype, "create", user=user):
		return {"error": f"You don't have permission to create {doctype}"}

	# Create an action request (pending approval)
	action = frappe.new_doc("AI Action Request")
	action.status = "Pending"
	action.action_type = "Create Document"
	action.target_doctype = doctype
	action.requested_by = user
	action.action_summary = f"Create new {doctype} with: {', '.join(f'{k}={v}' for k, v in list(fields.items())[:5])}"
	action.action_data = json.dumps({"fields": fields})
	action.flags.ignore_permissions = True
	action.insert()
	frappe.db.commit()

	return {
		"status": "pending_approval",
		"action_id": action.name,
		"message": f"Action request created. Waiting for your approval to create {doctype}.",
		"summary": action.action_summary,
		"action_type": "Create Document",
		"target_doctype": doctype,
		"fields": fields,
	}


def _tool_update_document(args, user):
	"""Create an action request for document update (requires approval)."""
	doctype = args["doctype"]
	name = args["name"]
	fields = args.get("fields", {})

	settings = frappe.get_cached_doc("AI Settings")

	if not settings.enable_execute_mode:
		return {"error": "Execute mode is not enabled. Ask your admin to enable it in AI Settings."}

	if not frappe.has_permission(doctype, "write", name, user=user):
		return {"error": f"You don't have permission to update {doctype} {name}"}

	action = frappe.new_doc("AI Action Request")
	action.status = "Pending"
	action.action_type = "Update Document"
	action.target_doctype = doctype
	action.target_name = name
	action.requested_by = user
	action.action_summary = f"Update {doctype} {name}: {', '.join(f'{k}={v}' for k, v in list(fields.items())[:5])}"
	action.action_data = json.dumps({"fields": fields})
	action.flags.ignore_permissions = True
	action.insert()
	frappe.db.commit()

	return {
		"status": "pending_approval",
		"action_id": action.name,
		"message": f"Action request created. Waiting for your approval to update {doctype} {name}.",
		"summary": action.action_summary,
		"action_type": "Update Document",
		"target_doctype": doctype,
		"target_name": name,
		"fields": fields,
	}


def _tool_submit_document(args, user):
	"""Create an action request for document submission (requires approval)."""
	doctype = args["doctype"]
	name = args["name"]

	settings = frappe.get_cached_doc("AI Settings")

	if not settings.enable_execute_mode:
		return {"error": "Execute mode is not enabled. Ask your admin to enable it in AI Settings."}

	if not frappe.has_permission(doctype, "submit", name, user=user):
		return {"error": f"You don't have permission to submit {doctype} {name}"}

	# Verify document exists and is in draft state
	try:
		doc = frappe.get_doc(doctype, name)
		if doc.docstatus != 0:
			return {"error": f"{doctype} {name} is not in Draft state (docstatus={doc.docstatus}). Only draft documents can be submitted."}
	except frappe.DoesNotExistError:
		return {"error": f"{doctype} {name} does not exist"}

	action = frappe.new_doc("AI Action Request")
	action.status = "Pending"
	action.action_type = "Submit Document"
	action.target_doctype = doctype
	action.target_name = name
	action.requested_by = user
	action.action_summary = f"Submit {doctype}: {name}"
	action.action_data = json.dumps({"action": "submit"})
	action.flags.ignore_permissions = True
	action.insert()
	frappe.db.commit()

	return {
		"status": "pending_approval",
		"action_id": action.name,
		"message": f"Action request created. Waiting for your approval to submit {doctype} {name}.",
		"summary": action.action_summary,
		"action_type": "Submit Document",
		"target_doctype": doctype,
		"target_name": name,
	}


def _tool_cancel_document(args, user):
	"""Create an action request for document cancellation (requires approval)."""
	doctype = args["doctype"]
	name = args["name"]

	settings = frappe.get_cached_doc("AI Settings")

	if not settings.enable_execute_mode:
		return {"error": "Execute mode is not enabled. Ask your admin to enable it in AI Settings."}

	if not frappe.has_permission(doctype, "cancel", name, user=user):
		return {"error": f"You don't have permission to cancel {doctype} {name}"}

	# Verify document is submitted
	try:
		doc = frappe.get_doc(doctype, name)
		if doc.docstatus != 1:
			return {"error": f"{doctype} {name} is not submitted (docstatus={doc.docstatus}). Only submitted documents can be cancelled."}
	except frappe.DoesNotExistError:
		return {"error": f"{doctype} {name} does not exist"}

	action = frappe.new_doc("AI Action Request")
	action.status = "Pending"
	action.action_type = "Cancel Document"
	action.target_doctype = doctype
	action.target_name = name
	action.requested_by = user
	action.action_summary = f"Cancel {doctype}: {name} (WARNING: This may be irreversible)"
	action.action_data = json.dumps({"action": "cancel"})
	action.flags.ignore_permissions = True
	action.insert()
	frappe.db.commit()

	return {
		"status": "pending_approval",
		"action_id": action.name,
		"message": f"⚠️ Action request created. This will CANCEL {doctype} {name}. Please review carefully before approving.",
		"summary": action.action_summary,
		"action_type": "Cancel Document",
		"target_doctype": doctype,
		"target_name": name,
	}


def _tool_delete_document(args, user):
	"""Create an action request for document deletion (requires approval)."""
	doctype = args["doctype"]
	name = args["name"]

	settings = frappe.get_cached_doc("AI Settings")

	if not settings.enable_execute_mode:
		return {"error": "Execute mode is not enabled. Ask your admin to enable it in AI Settings."}

	if not frappe.has_permission(doctype, "delete", name, user=user):
		return {"error": f"You don't have permission to delete {doctype} {name}"}

	# Verify document exists
	if not frappe.db.exists(doctype, name):
		return {"error": f"{doctype} {name} does not exist"}

	action = frappe.new_doc("AI Action Request")
	action.status = "Pending"
	action.action_type = "Delete Document"
	action.target_doctype = doctype
	action.target_name = name
	action.requested_by = user
	action.action_summary = f"DELETE {doctype}: {name} (WARNING: This is PERMANENT and irreversible)"
	action.action_data = json.dumps({"action": "delete"})
	action.flags.ignore_permissions = True
	action.insert()
	frappe.db.commit()

	return {
		"status": "pending_approval",
		"action_id": action.name,
		"message": f"🚨 Action request created. This will PERMANENTLY DELETE {doctype} {name}. This cannot be undone!",
		"summary": action.action_summary,
		"action_type": "Delete Document",
		"target_doctype": doctype,
		"target_name": name,
	}


def _tool_send_communication(args, user):
	"""Create an action request for sending a communication/reply (requires approval)."""
	doctype = args["doctype"]
	name = args["name"]
	content = args["content"]
	subject = args.get("subject", "")
	recipients = args.get("recipients", "")
	cc = args.get("cc", "")
	send_email = args.get("send_email", True)
	comm_type = args.get("communication_type", "Communication")

	settings = frappe.get_cached_doc("AI Settings")

	if not settings.enable_execute_mode:
		return {"error": "Execute mode is not enabled. Ask your admin to enable it in AI Settings."}

	if not frappe.has_permission(doctype, "read", name, user=user):
		return {"error": f"You don't have access to {doctype} {name}"}

	# Auto-detect recipients from the document if not provided
	if not recipients:
		try:
			doc = frappe.get_doc(doctype, name)
			# Try common email fields
			for field in ["email_id", "email", "contact_email", "customer_primary_contact"]:
				if hasattr(doc, field) and doc.get(field):
					recipients = doc.get(field)
					break
			# Fall back to last incoming communication sender
			if not recipients:
				last_comm = frappe.db.sql(
					"""SELECT sender FROM tabCommunication
					WHERE reference_doctype=%s AND reference_name=%s
					AND communication_type='Communication' AND sent_or_received='Received'
					ORDER BY creation DESC LIMIT 1""",
					(doctype, name), as_dict=True
				)
				if last_comm:
					recipients = last_comm[0].sender
		except Exception:
			pass

	if not subject:
		subject = f"Re: {doctype} {name}"

	action = frappe.new_doc("AI Action Request")
	action.status = "Pending"
	action.action_type = "Send Communication"
	action.target_doctype = doctype
	action.target_name = name
	action.requested_by = user
	recipient_preview = recipients[:50] if recipients else "auto-detect"
	action.action_summary = f"Send {'email' if send_email else 'message'} for {doctype} {name} to {recipient_preview}: {content[:100]}..."
	action.action_data = json.dumps({
		"subject": subject,
		"content": content,
		"recipients": recipients,
		"cc": cc,
		"send_email": send_email,
		"communication_type": comm_type,
	})
	action.flags.ignore_permissions = True
	action.insert()
	frappe.db.commit()

	return {
		"status": "pending_approval",
		"action_id": action.name,
		"message": f"Action request created. Waiting for your approval to send {'email' if send_email else 'communication'} for {doctype} {name}.",
		"summary": action.action_summary,
		"action_type": "Send Communication",
		"target_doctype": doctype,
		"target_name": name,
		"recipients": recipients,
		"content_preview": content[:200],
	}


def _tool_add_comment(args, user):
	"""Create an action request for adding a comment to a document (requires approval)."""
	doctype = args["doctype"]
	name = args["name"]
	comment = args["comment"]

	settings = frappe.get_cached_doc("AI Settings")

	if not settings.enable_execute_mode:
		return {"error": "Execute mode is not enabled. Ask your admin to enable it in AI Settings."}

	if not frappe.has_permission(doctype, "read", name, user=user):
		return {"error": f"You don't have access to {doctype} {name}"}

	action = frappe.new_doc("AI Action Request")
	action.status = "Pending"
	action.action_type = "Add Comment"
	action.target_doctype = doctype
	action.target_name = name
	action.requested_by = user
	action.action_summary = f"Add comment on {doctype} {name}: {comment[:100]}..."
	action.action_data = json.dumps({"comment": comment})
	action.flags.ignore_permissions = True
	action.insert()
	frappe.db.commit()

	return {
		"status": "pending_approval",
		"action_id": action.name,
		"message": f"Action request created. Waiting for your approval to add a comment on {doctype} {name}.",
		"summary": action.action_summary,
		"action_type": "Add Comment",
		"target_doctype": doctype,
		"target_name": name,
	}


def _tool_web_search(args, user):
	"""Search the internet using DuckDuckGo."""
	query = args.get("query", "").strip()
	if not query:
		return {"error": "Search query is required"}

	max_results = min(max(int(args.get("max_results", 5)), 1), 10)

	try:
		from duckduckgo_search import DDGS

		with DDGS() as ddgs:
			raw = list(ddgs.text(query, max_results=max_results))

		results = []
		for r in raw:
			results.append({
				"title": r.get("title", ""),
				"url": r.get("href", ""),
				"snippet": r.get("body", ""),
			})

		if not results:
			return {"message": "No results found", "query": query}

		return {
			"query": query,
			"result_count": len(results),
			"results": results,
		}
	except ImportError:
		return {"error": "Web search is not available. Install duckduckgo-search package."}
	except Exception as e:
		frappe.logger("oly_ai").warning(f"Web search failed: {e}")
		return {"error": f"Search failed: {str(e)}"}


def _tool_analyze_file(args, user):
	"""Parse and analyze an uploaded file."""
	file_url = args.get("file_url", "").strip()
	if not file_url:
		return {"error": "file_url is required"}

	try:
		from oly_ai.core.file_parser import parse_file
		result = parse_file(file_url)
		if "error" in result:
			return result

		# Truncate for tool response (keep within reasonable size)
		text = result.get("text", "")
		truncated = len(text) > 30000
		if truncated:
			text = text[:30000] + "\n... [truncated]"

		return {
			"filename": result.get("filename", ""),
			"extension": result.get("extension", ""),
			"content": text,
			"truncated": truncated or result.get("truncated", False),
			"pages": result.get("pages"),
			"rows": result.get("rows"),
		}
	except Exception as e:
		frappe.logger("oly_ai").warning(f"File analysis failed: {e}")
		return {"error": f"Failed to analyze file: {str(e)}"}


def _get_max_records():
	"""Get max records per query from settings."""
	try:
		return cint(frappe.db.get_single_value("AI Settings", "max_records_per_query")) or 100
	except Exception:
		return 100


def get_available_tools(user=None, mode="ask"):
	"""Get the list of tools available for a given user and mode.

	Args:
		user: Frappe user
		mode: Chat mode (ask, research, agent, execute)

	Returns:
		list: Tool definitions available for this context
	"""
	user = user or frappe.session.user
	settings = frappe.get_cached_doc("AI Settings")

	# Read-only tools (always available in agent/execute modes if data queries enabled)
	read_tools = ["search_documents", "get_document", "count_documents", "get_report", "get_list_summary",
	              "web_search", "analyze_file"]
	write_tools = ["create_document", "update_document", "submit_document", "cancel_document",
	               "delete_document", "send_communication", "add_comment"]

	# Only agent and execute modes get tools
	if mode not in ("agent", "execute"):
		return []

	available = []

	if settings.enable_data_queries:
		# Check access control
		from oly_ai.core.access_control import check_user_access
		access = check_user_access(user)

		if access.get("can_query_data", True):
			for tool in TOOL_DEFINITIONS:
				if tool["function"]["name"] in read_tools:
					available.append(tool)

		if access.get("can_execute_actions", False) and settings.enable_execute_mode and mode == "execute":
			for tool in TOOL_DEFINITIONS:
				if tool["function"]["name"] in write_tools:
					available.append(tool)

	# Add custom tools
	available.extend(_get_custom_tools(user))

	return available


def _get_custom_tools(user=None):
	"""Load enabled custom tools from AI Custom Tool DocType."""
	user = user or frappe.session.user
	try:
		custom_tools = frappe.get_all(
			"AI Custom Tool",
			filters={"enabled": 1},
			fields=["name", "tool_name", "allowed_roles"],
		)
	except Exception:
		return []

	result = []
	user_roles = frappe.get_roles(user)

	for ct in custom_tools:
		# Role check
		if ct.allowed_roles:
			allowed = [r.strip() for r in ct.allowed_roles.split(",") if r.strip()]
			if allowed and not any(r in user_roles for r in allowed):
				continue

		try:
			doc = frappe.get_cached_doc("AI Custom Tool", ct.name)
			result.append(doc.get_tool_definition())
		except Exception:
			pass

	return result


def _execute_custom_tool(tool_name, arguments, user):
	"""Execute a custom tool by name. Returns None if not found."""
	try:
		ct_name = frappe.db.get_value(
			"AI Custom Tool",
			{"tool_name": tool_name, "enabled": 1},
			"name",
		)
		if not ct_name:
			return None

		doc = frappe.get_doc("AI Custom Tool", ct_name)

		# Approval flow
		if doc.require_approval:
			action = frappe.new_doc("AI Action Request")
			action.status = "Pending"
			action.action_type = f"Custom Tool: {doc.label}"
			action.requested_by = user
			action.action_summary = f"Run custom tool '{doc.label}' with args: {json.dumps(arguments)[:200]}"
			action.action_data = json.dumps({"tool_name": tool_name, "arguments": arguments})
			action.flags.ignore_permissions = True
			action.insert()
			frappe.db.commit()
			return {
				"status": "pending_approval",
				"action_id": action.name,
				"message": f"Custom tool '{doc.label}' requires approval before execution.",
			}

		return doc.execute(arguments, user)
	except Exception:
		return None
