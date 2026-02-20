# Copyright (c) 2026, OLY Technologies and contributors
# SLA Monitor — Scheduled job to detect overdue/at-risk Issues and notify agents
# Runs every 30 minutes via scheduler_events cron

import frappe
from frappe import _
from frappe.utils import now_datetime, time_diff_in_hours, get_url_to_form


def check_sla_status():
	"""Scheduled task: Check for Issues approaching or past SLA deadlines.

	Sends notifications to assigned agents and System Managers for:
	- Issues past their response SLA
	- Issues past their resolution SLA
	- Issues approaching SLA deadline (within 2 hours)
	"""
	try:
		settings = frappe.get_cached_doc("AI Settings")
		if not getattr(settings, "enable_sla_monitoring", 0):
			return
	except Exception:
		return

	now = now_datetime()

	# Find open Issues with SLA deadlines
	issues = frappe.get_all(
		"Issue",
		filters={
			"status": ["in", ["Open", "Replied"]],
		},
		fields=[
			"name", "subject", "status", "priority", "owner",
			"response_by", "resolution_by",
			"first_responded_on", "resolution_date",
			"agreement_status",
		],
		limit=200,
	)

	overdue_issues = []
	at_risk_issues = []

	for issue in issues:
		# Check response SLA
		if issue.response_by and not issue.first_responded_on:
			hours_remaining = time_diff_in_hours(issue.response_by, now)
			if hours_remaining < 0:
				overdue_issues.append({
					"issue": issue,
					"sla_type": "Response",
					"hours_overdue": abs(hours_remaining),
				})
			elif hours_remaining <= 2:
				at_risk_issues.append({
					"issue": issue,
					"sla_type": "Response",
					"hours_remaining": hours_remaining,
				})

		# Check resolution SLA
		if issue.resolution_by and not issue.resolution_date:
			hours_remaining = time_diff_in_hours(issue.resolution_by, now)
			if hours_remaining < 0:
				overdue_issues.append({
					"issue": issue,
					"sla_type": "Resolution",
					"hours_overdue": abs(hours_remaining),
				})
			elif hours_remaining <= 4:
				at_risk_issues.append({
					"issue": issue,
					"sla_type": "Resolution",
					"hours_remaining": hours_remaining,
				})

	# Send notifications for overdue issues
	for item in overdue_issues:
		_notify_sla_breach(item["issue"], item["sla_type"], item["hours_overdue"])

	# Send notifications for at-risk issues
	for item in at_risk_issues:
		_notify_sla_at_risk(item["issue"], item["sla_type"], item["hours_remaining"])

	# Generate AI triage suggestions for high-priority overdue issues
	high_priority_overdue = [
		i for i in overdue_issues
		if i["issue"].priority in ("Urgent", "High") and i["hours_overdue"] > 1
	]
	if high_priority_overdue:
		_generate_escalation_suggestions(high_priority_overdue)

	frappe.logger("oly_ai").info(
		f"SLA check complete: {len(overdue_issues)} overdue, {len(at_risk_issues)} at risk"
	)


def _notify_sla_breach(issue, sla_type, hours_overdue):
	"""Send notification for an SLA breach."""
	# Deduplicate: don't notify more than once per hour per issue
	cache_key = f"oly_ai_sla_notified_{issue.name}_{sla_type}"
	if frappe.cache().get(cache_key):
		return
	frappe.cache().set(cache_key, 1, expires_in_sec=3600)

	hours_str = f"{hours_overdue:.1f}" if hours_overdue < 24 else f"{hours_overdue / 24:.1f} days"
	subject = _("🔴 SLA Breach: {0} — {1} overdue by {2}h").format(
		issue.name, sla_type, hours_str
	)
	message = _(
		"**Issue:** [{name}]({link})\n"
		"**Subject:** {subject}\n"
		"**Priority:** {priority}\n"
		"**SLA Type:** {sla_type} SLA breached\n"
		"**Overdue by:** {hours} hours\n\n"
		"Immediate attention required."
	).format(
		name=issue.name,
		link=get_url_to_form("Issue", issue.name),
		subject=issue.subject or "",
		priority=issue.priority or "Medium",
		sla_type=sla_type,
		hours=hours_str,
	)

	_send_sla_notification(issue, subject, message)


def _notify_sla_at_risk(issue, sla_type, hours_remaining):
	"""Send notification for an issue approaching SLA deadline."""
	cache_key = f"oly_ai_sla_atrisk_{issue.name}_{sla_type}"
	if frappe.cache().get(cache_key):
		return
	frappe.cache().set(cache_key, 1, expires_in_sec=3600)

	hours_str = f"{hours_remaining:.1f}"
	subject = _("⚠️ SLA At Risk: {0} — {1} due in {2}h").format(
		issue.name, sla_type, hours_str
	)
	message = _(
		"**Issue:** [{name}]({link})\n"
		"**Subject:** {subject}\n"
		"**Priority:** {priority}\n"
		"**SLA Type:** {sla_type} SLA\n"
		"**Time remaining:** {hours} hours\n\n"
		"Please address this issue before the SLA deadline."
	).format(
		name=issue.name,
		link=get_url_to_form("Issue", issue.name),
		subject=issue.subject or "",
		priority=issue.priority or "Medium",
		sla_type=sla_type,
		hours=hours_str,
	)

	_send_sla_notification(issue, subject, message)


def _send_sla_notification(issue, subject, message):
	"""Send SLA notification to document owner, assignees, and managers."""
	recipients = set()

	# Document owner
	if issue.owner and issue.owner != "Administrator":
		recipients.add(issue.owner)

	# Assigned users
	try:
		assignments = frappe.get_all(
			"ToDo",
			filters={
				"reference_type": "Issue",
				"reference_name": issue.name,
				"status": "Open",
			},
			fields=["allocated_to"],
		)
		for a in assignments:
			if a.allocated_to:
				recipients.add(a.allocated_to)
	except Exception:
		pass

	# System Managers (for high priority)
	if issue.priority in ("Urgent", "High"):
		try:
			managers = frappe.get_all(
				"Has Role",
				filters={"role": "System Manager", "parenttype": "User"},
				fields=["parent"],
				distinct=True,
			)
			for m in managers:
				if m.parent != "Administrator":
					recipients.add(m.parent)
		except Exception:
			pass

	for user in recipients:
		try:
			notification = frappe.new_doc("Notification Log")
			notification.for_user = user
			notification.type = "Alert"
			notification.subject = subject
			notification.email_content = message
			notification.document_type = "Issue"
			notification.document_name = issue.name
			notification.from_user = "Administrator"
			notification.flags.ignore_permissions = True
			notification.insert()
		except Exception:
			pass


def _generate_escalation_suggestions(overdue_items):
	"""Generate AI escalation suggestions for high-priority overdue issues.

	Creates a summary comment on each issue with recommended actions.
	"""
	for item in overdue_items[:5]:  # Limit to 5 at a time
		issue = item["issue"]
		cache_key = f"oly_ai_escalation_{issue.name}"
		if frappe.cache().get(cache_key):
			continue
		frappe.cache().set(cache_key, 1, expires_in_sec=86400)  # Once per day

		try:
			from oly_ai.core.context import get_document_context
			ctx = get_document_context("Issue", issue.name, max_length=3000)

			from oly_ai.core.provider import LLMProvider
			provider = LLMProvider()

			messages = [
				{"role": "system", "content": (
					"You are an AI escalation assistant. Analyze this overdue support issue "
					"and suggest 2-3 concrete actions to resolve it quickly. Be brief and actionable."
				)},
				{"role": "user", "content": (
					f"This Issue is overdue by {item['hours_overdue']:.1f} hours "
					f"(SLA: {item['sla_type']}).\n\n{ctx}\n\n"
					f"Suggest escalation actions."
				)},
			]

			response = provider.chat(messages)
			suggestion = response.get("content", "").strip()

			if suggestion:
				comment = frappe.get_doc({
					"doctype": "Comment",
					"comment_type": "Comment",
					"reference_doctype": "Issue",
					"reference_name": issue.name,
					"comment_by": "Administrator",
					"content": (
						f'<div class="ai-escalation-suggestion">'
						f'<strong>🤖 AI Escalation Suggestion</strong> '
						f'<small>(SLA {item["sla_type"]} overdue by {item["hours_overdue"]:.1f}h)</small>'
						f'<hr>{frappe.utils.md_to_html(suggestion)}</div>'
					),
				})
				comment.flags.ignore_permissions = True
				comment.insert()

		except Exception as e:
			frappe.log_error(
				f"AI escalation suggestion failed for {issue.name}: {e}",
				"AI SLA Monitor"
			)
