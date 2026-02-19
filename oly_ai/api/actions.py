# Copyright (c) 2026, OLY Technologies and contributors
# Actions API — Approval flow for AI-proposed actions

import json
import frappe
from frappe import _


@frappe.whitelist()
def get_pending_actions(session_name=None):
	"""Get pending action requests for the current user.

	Args:
		session_name: Optional — filter by chat session

	Returns:
		list: Pending AI Action Requests
	"""
	user = frappe.session.user
	filters = {"requested_by": user, "status": "Pending"}

	if session_name:
		filters["session"] = session_name

	actions = frappe.get_all(
		"AI Action Request",
		filters=filters,
		fields=[
			"name", "action_type", "target_doctype", "target_name",
			"action_summary", "action_data", "status", "creation",
		],
		order_by="creation desc",
		limit=20,
	)

	# Parse action_data for each
	for a in actions:
		try:
			a["parsed_data"] = json.loads(a.action_data) if a.action_data else {}
		except json.JSONDecodeError:
			a["parsed_data"] = {}

	return actions


@frappe.whitelist()
def approve_action(action_name):
	"""Approve and execute a pending action.

	Args:
		action_name: AI Action Request name

	Returns:
		dict: {"status": "success"|"error", "message": str}
	"""
	user = frappe.session.user

	action = frappe.get_doc("AI Action Request", action_name)

	# Only the requester or admin can approve
	if action.requested_by != user and user != "Administrator":
		frappe.throw(_("Only the requesting user can approve this action"), frappe.PermissionError)

	if action.status != "Pending":
		frappe.throw(_("This action is no longer pending (status: {0})").format(action.status))

	# Set to Approved then execute
	action.status = "Approved"
	action.save(ignore_permissions=True)
	frappe.db.commit()

	result = action.execute()

	# Log to audit
	_log_action_audit(action, result)

	return result


@frappe.whitelist()
def reject_action(action_name, reason=None):
	"""Reject a pending action.

	Args:
		action_name: AI Action Request name
		reason: Optional rejection reason

	Returns:
		dict: {"status": "rejected"}
	"""
	user = frappe.session.user

	action = frappe.get_doc("AI Action Request", action_name)

	if action.requested_by != user and user != "Administrator":
		frappe.throw(_("Only the requesting user can reject this action"), frappe.PermissionError)

	if action.status != "Pending":
		frappe.throw(_("This action is no longer pending"))

	action.status = "Rejected"
	action.result_message = reason or "Rejected by user"
	action.save(ignore_permissions=True)
	frappe.db.commit()

	return {"status": "rejected", "message": "Action rejected"}


@frappe.whitelist()
def approve_all(session_name):
	"""Approve all pending actions for a session.

	Args:
		session_name: AI Chat Session name

	Returns:
		dict: {"approved": N, "failed": N, "results": []}
	"""
	user = frappe.session.user

	actions = frappe.get_all(
		"AI Action Request",
		filters={"session": session_name, "requested_by": user, "status": "Pending"},
		pluck="name",
	)

	results = {"approved": 0, "failed": 0, "results": []}

	for action_name in actions:
		try:
			result = approve_action(action_name)
			if result.get("status") == "success":
				results["approved"] += 1
			else:
				results["failed"] += 1
			results["results"].append({"action": action_name, **result})
		except Exception as e:
			results["failed"] += 1
			results["results"].append({"action": action_name, "status": "error", "message": str(e)})

	return results


@frappe.whitelist()
def reject_all(session_name, reason=None):
	"""Reject all pending actions for a session.

	Returns:
		dict: {"rejected": N}
	"""
	user = frappe.session.user

	actions = frappe.get_all(
		"AI Action Request",
		filters={"session": session_name, "requested_by": user, "status": "Pending"},
		pluck="name",
	)

	for action_name in actions:
		try:
			reject_action(action_name, reason)
		except Exception:
			pass

	return {"rejected": len(actions)}


def _log_action_audit(action, result):
	"""Log action execution to AI Audit Log."""
	try:
		from oly_ai.api.gateway import _log_audit
		_log_audit(
			user=action.requested_by,
			feature="Execute",
			doctype=action.target_doctype or "",
			name=action.target_name or "",
			model="",
			prompt=action.action_summary or "",
			response_text=result.get("message", ""),
			tokens_in=0,
			tokens_out=0,
			cost=0,
			response_time=0,
			status=result.get("status", "Unknown"),
		)
	except Exception:
		pass
