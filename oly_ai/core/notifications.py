# Copyright (c) 2026, OLY Technologies and contributors
# Notifications — Frappe notifications for AI events
# Covers: action requests, approvals, workflow completions, daily digest

import frappe
from frappe import _
from frappe.utils import now_datetime, add_days, get_url_to_form


def notify_action_request(action_doc):
	"""Send notification when an AI action request is created.

	Notifies the requesting user and all System Managers.
	"""
	user = action_doc.requested_by or frappe.session.user
	subject = _("AI Action Request: {0}").format(action_doc.action_type)
	message = _(
		"A new AI action request needs your approval:\n\n"
		"**Type:** {action_type}\n"
		"**Summary:** {summary}\n"
		"**DocType:** {doctype}\n\n"
		"[Review and approve →]({link})"
	).format(
		action_type=action_doc.action_type,
		summary=action_doc.action_summary or "",
		doctype=action_doc.target_doctype or "—",
		link=get_url_to_form("AI Action Request", action_doc.name),
	)

	# Notify the requesting user
	_create_notification(
		for_user=user,
		type="Alert",
		subject=subject,
		message=message,
		document_type="AI Action Request",
		document_name=action_doc.name,
	)

	# Notify System Managers
	managers = frappe.get_all(
		"Has Role",
		filters={"role": "System Manager", "parenttype": "User"},
		fields=["parent"],
	)
	for m in managers:
		if m.parent != user and m.parent != "Administrator":
			_create_notification(
				for_user=m.parent,
				type="Alert",
				subject=subject,
				message=message,
				document_type="AI Action Request",
				document_name=action_doc.name,
			)


def notify_action_result(action_doc, status):
	"""Notify user when their action request is approved/rejected.

	Args:
		action_doc: AI Action Request document
		status: "Executed" or "Rejected"
	"""
	user = action_doc.requested_by
	if not user:
		return

	icon = "✓" if status == "Executed" else "✕"
	color = "green" if status == "Executed" else "red"

	subject = _("AI Action {status}: {type}").format(
		status=status,
		type=action_doc.action_type,
	)
	message = _(
		"{icon} Your AI action request has been **{status}**.\n\n"
		"**Type:** {action_type}\n"
		"**Summary:** {summary}"
	).format(
		icon=icon,
		status=status.lower(),
		action_type=action_doc.action_type,
		summary=action_doc.action_summary or "",
	)

	_create_notification(
		for_user=user,
		type="Alert",
		subject=subject,
		message=message,
		document_type="AI Action Request",
		document_name=action_doc.name,
	)


def notify_workflow_complete(workflow_doc, results, success):
	"""Notify workflow owner when execution completes.

	Args:
		workflow_doc: AI Workflow document
		results: List of step results
		success: Boolean
	"""
	user = workflow_doc.owner_user or workflow_doc.owner
	if not user:
		return

	status_text = _("completed successfully") if success else _("failed")
	icon = "✓" if success else "✕"
	step_count = len(results) if results else 0

	subject = _("AI Workflow {status}: {title}").format(
		status="Completed" if success else "Failed",
		title=workflow_doc.title,
	)
	message = _(
		"{icon} Workflow **{title}** has {status}.\n\n"
		"**Steps:** {steps} executed\n"
		"**Run Count:** {count}\n\n"
		"[View workflow →]({link})"
	).format(
		icon=icon,
		title=workflow_doc.title,
		status=status_text,
		steps=step_count,
		count=workflow_doc.run_count or 1,
		link=get_url_to_form("AI Workflow", workflow_doc.name),
	)

	_create_notification(
		for_user=user,
		type="Alert",
		subject=subject,
		message=message,
		document_type="AI Workflow",
		document_name=workflow_doc.name,
	)


def send_daily_digest():
	"""Scheduled task: send daily AI usage digest to System Managers.

	Summarizes yesterday's AI usage: requests, cost, top users, errors.
	"""
	yesterday = add_days(now_datetime(), -1).strftime("%Y-%m-%d")

	# Gather stats
	total_requests = frappe.db.count("AI Audit Log", {"date": yesterday}) or 0
	if total_requests == 0:
		return  # No activity, skip digest

	total_cost = frappe.db.sql(
		"SELECT COALESCE(SUM(cost), 0) FROM `tabAI Audit Log` WHERE date = %s",
		yesterday,
	)[0][0] or 0

	error_count = frappe.db.count("AI Audit Log", {
		"date": yesterday,
		"status": "Error",
	}) or 0

	# Top users
	top_users = frappe.db.sql("""
		SELECT user, COUNT(*) as cnt, SUM(cost) as total_cost
		FROM `tabAI Audit Log`
		WHERE date = %s
		GROUP BY user
		ORDER BY cnt DESC
		LIMIT 5
	""", yesterday, as_dict=True)

	# Pending actions
	pending_count = frappe.db.count("AI Action Request", {"status": "Pending"}) or 0

	# Build message
	user_rows = ""
	for u in top_users:
		user_rows += f"- {u.user}: {u.cnt} requests (${u.total_cost:.4f})\n"

	message = _(
		"**AI Daily Digest — {date}**\n\n"
		"| Metric | Value |\n"
		"|--------|-------|\n"
		"| Total Requests | {requests} |\n"
		"| Total Cost | ${cost:.4f} |\n"
		"| Errors | {errors} |\n"
		"| Pending Actions | {pending} |\n\n"
		"**Top Users:**\n{users}\n\n"
		"[View dashboard →]({link})"
	).format(
		date=yesterday,
		requests=total_requests,
		cost=total_cost,
		errors=error_count,
		pending=pending_count,
		users=user_rows or "- No activity\n",
		link="/app/ai-dashboard",
	)

	# Send to System Managers
	managers = frappe.get_all(
		"Has Role",
		filters={"role": "System Manager", "parenttype": "User"},
		fields=["parent"],
		distinct=True,
	)
	for m in managers:
		if m.parent == "Administrator":
			continue
		_create_notification(
			for_user=m.parent,
			type="Alert",
			subject=_("AI Daily Digest — {0}").format(yesterday),
			message=message,
		)


def _create_notification(for_user, type, subject, message, document_type=None, document_name=None):
	"""Create a Frappe notification log entry."""
	try:
		notification = frappe.new_doc("Notification Log")
		notification.for_user = for_user
		notification.type = type
		notification.subject = subject
		notification.email_content = message
		if document_type:
			notification.document_type = document_type
		if document_name:
			notification.document_name = document_name
		notification.from_user = "Administrator"
		notification.flags.ignore_permissions = True
		notification.insert()
	except Exception:
		# Don't fail the main operation if notification fails
		frappe.log_error(f"Failed to create notification for {for_user}", "AI Notification")
