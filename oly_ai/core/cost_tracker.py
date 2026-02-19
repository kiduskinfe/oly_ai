# Copyright (c) 2026, OLY Technologies and contributors
# Token usage tracking + budget enforcement

import frappe
from frappe.utils import today, getdate, get_first_day, get_last_day, flt


# Approximate cost per 1M tokens (USD) — updated 2026-02
MODEL_COSTS = {
	# OpenAI
	"gpt-4o-mini": {"input": 0.15, "output": 0.60},
	"gpt-4o": {"input": 2.50, "output": 10.00},
	"gpt-5": {"input": 5.00, "output": 15.00},
	"gpt-5.2": {"input": 6.00, "output": 18.00},
	"gpt-5-chat-latest": {"input": 5.00, "output": 15.00},
	"gpt-5.2-chat-latest": {"input": 6.00, "output": 18.00},
	"gpt-4-turbo": {"input": 10.00, "output": 30.00},
	"text-embedding-3-small": {"input": 0.02, "output": 0},
	"text-embedding-3-large": {"input": 0.13, "output": 0},
	# Anthropic
	"claude-3-7-sonnet-latest": {"input": 3.00, "output": 15.00},
	"claude-3-5-sonnet-20241022": {"input": 3.00, "output": 15.00},
	"claude-3-5-haiku-20241022": {"input": 0.80, "output": 4.00},
	"claude-3-opus-20240229": {"input": 15.00, "output": 75.00},
	# Other API models (approximate placeholders)
	"gemini-2.0-flash": {"input": 0.20, "output": 0.80},
	"gemini-1.5-pro": {"input": 1.25, "output": 5.00},
	"deepseek-chat": {"input": 0.27, "output": 1.10},
	"grok-2-latest": {"input": 2.00, "output": 10.00},
	"llama-3.3-70b-instruct": {"input": 0.79, "output": 0.79},
	# Self-hosted (free)
	"llama3.1": {"input": 0, "output": 0},
	"mistral": {"input": 0, "output": 0},
	"qwen2.5": {"input": 0, "output": 0},
}


def estimate_cost(model, tokens_input, tokens_output):
	"""Estimate cost in USD for a request."""
	costs = MODEL_COSTS.get(model, {"input": 1.0, "output": 3.0})  # conservative default
	cost = (tokens_input * costs["input"] / 1_000_000) + (tokens_output * costs["output"] / 1_000_000)
	return round(cost, 6)


def check_budget(user=None):
	"""Check if the user/system is within budget. Returns (allowed, reason)."""
	settings = frappe.get_cached_doc("AI Settings")
	user = user or frappe.session.user

	# Check monthly budget
	if settings.monthly_budget_usd and settings.monthly_budget_usd > 0:
		current_spend = get_current_month_spend()
		if current_spend >= settings.monthly_budget_usd:
			return False, f"Monthly AI budget of ${settings.monthly_budget_usd} exceeded (${current_spend:.2f} spent)"

	# Check daily per-user limit
	if settings.daily_request_limit and settings.daily_request_limit > 0:
		user_requests = get_user_requests_today(user)
		if user_requests >= settings.daily_request_limit:
			return False, f"Daily AI request limit of {settings.daily_request_limit} reached ({user_requests} used)"

	return True, ""


def track_usage(model, tokens_input, tokens_output, user=None):
	"""Record token usage and update counters."""
	settings = frappe.get_cached_doc("AI Settings")
	if not settings.enable_cost_tracking:
		return 0

	cost = estimate_cost(model, tokens_input, tokens_output)
	user = user or frappe.session.user

	# Update settings counters (best-effort, non-blocking)
	try:
		current_spend = flt(settings.current_month_spend) + cost
		requests_today = (settings.requests_today or 0) + 1
		frappe.db.set_single_value("AI Settings", "current_month_spend", current_spend)
		frappe.db.set_single_value("AI Settings", "requests_today", requests_today)

		# Budget warning notification
		_check_budget_warning(settings, current_spend)
	except Exception:
		pass  # Non-critical — don't block AI calls for counter updates

	return cost


def _check_budget_warning(settings, current_spend):
	"""Send a one-time notification to admins when spend crosses the warning threshold."""
	try:
		warning_pct = int(settings.budget_warning_pct or 0)
		budget = flt(settings.monthly_budget_usd)
		if not warning_pct or not budget or budget <= 0:
			return

		threshold = budget * warning_pct / 100
		# Only fire once per month — check if we just crossed the threshold
		previous_spend = current_spend - flt(settings.current_month_spend)
		if current_spend >= threshold and (previous_spend < threshold or previous_spend == 0):
			# Notify all System Managers
			admins = frappe.get_all(
				"Has Role",
				filters={"role": "System Manager", "parenttype": "User"},
				pluck="parent",
			)
			admins = list(set(admins))

			for admin in admins:
				if not frappe.db.exists("User", {"name": admin, "enabled": 1}):
					continue
				try:
					notification = frappe.new_doc("Notification Log")
					notification.for_user = admin
					notification.type = "Alert"
					notification.subject = f"AI Budget Warning: {warning_pct}% spent (${current_spend:.2f} of ${budget:.2f})"
					notification.email_content = (
						f"<p>Your AI monthly budget has reached <strong>{warning_pct}%</strong>.</p>"
						f"<p>Current spend: <strong>${current_spend:.2f}</strong> of <strong>${budget:.2f}</strong> budget.</p>"
						f"<p>Consider reviewing usage in <a href='/app/ai-settings'>AI Settings</a> "
						f"or the <a href='/app/ai-usage-dashboard'>Usage Dashboard</a>.</p>"
					)
					notification.flags.ignore_permissions = True
					notification.insert()
				except Exception:
					pass  # Best-effort notification
	except Exception:
		pass  # Never block for notification failures


def get_current_month_spend():
	"""Calculate total spend for the current month from audit logs."""
	first_day = get_first_day(today())
	result = frappe.db.sql(
		"""
		SELECT COALESCE(SUM(estimated_cost_usd), 0) as total
		FROM `tabAI Audit Log`
		WHERE creation >= %s AND status = 'Success'
		""",
		first_day,
		as_dict=True,
	)
	return flt(result[0].total) if result else 0


def get_user_requests_today(user):
	"""Count requests by user today."""
	return frappe.db.count(
		"AI Audit Log",
		filters={
			"user": user,
			"creation": [">=", today()],
			"status": ["in", ["Success", "Cached"]],
		},
	)


def reset_daily_counters():
	"""Scheduled task: reset daily request counter."""
	frappe.db.set_single_value("AI Settings", "requests_today", 0)
	frappe.db.commit()


def generate_weekly_usage_report():
	"""Scheduled task: generate a weekly AI usage summary."""
	from frappe.utils import add_days

	week_ago = add_days(today(), -7)
	stats = frappe.db.sql(
		"""
		SELECT
			user,
			COUNT(*) as total_requests,
			SUM(tokens_input) as total_input_tokens,
			SUM(tokens_output) as total_output_tokens,
			SUM(estimated_cost_usd) as total_cost,
			AVG(response_time) as avg_response_time
		FROM `tabAI Audit Log`
		WHERE creation >= %s AND status = 'Success'
		GROUP BY user
		ORDER BY total_cost DESC
		""",
		week_ago,
		as_dict=True,
	)

	if not stats:
		return

	# Log summary (could be extended to send email)
	total_cost = sum(s.total_cost or 0 for s in stats)
	total_requests = sum(s.total_requests or 0 for s in stats)
	frappe.logger("oly_ai").info(
		f"Weekly AI Usage: {total_requests} requests, ${total_cost:.2f} total cost, {len(stats)} users"
	)
