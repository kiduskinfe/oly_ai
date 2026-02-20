# Copyright (c) 2026, OLY Technologies and contributors
# Usage Dashboard API — provides stats for the AI Usage Dashboard page

import frappe
from frappe import _
from frappe.utils import nowdate, getdate, add_days, add_months, get_first_day, get_last_day


@frappe.whitelist()
def get_dashboard_data(from_date=None, to_date=None):
	"""Get comprehensive dashboard data for AI usage.

	Args:
		from_date: Start date (default: first day of current month)
		to_date: End date (default: today)
	"""
	frappe.only_for(["System Manager", "Administrator"])

	settings = frappe.get_cached_doc("AI Settings")

	# Summary cards
	today = nowdate()
	month_start = from_date or str(get_first_day(today))
	period_end = to_date or today
	# For "today" count, always use actual today
	actual_today = today

	total_requests = frappe.db.count("AI Audit Log")
	month_requests = frappe.db.sql("""
		SELECT COUNT(*) FROM `tabAI Audit Log`
		WHERE creation >= %s AND creation <= %s
	""", (month_start, period_end + " 23:59:59"))[0][0]
	today_requests = frappe.db.count("AI Audit Log", {"creation": [">=", actual_today]})

	# Cost data
	month_cost = frappe.db.sql("""
		SELECT COALESCE(SUM(estimated_cost_usd), 0) as total
		FROM `tabAI Audit Log`
		WHERE creation >= %s AND creation <= %s AND status = 'Success'
	""", (month_start, period_end + " 23:59:59"), as_dict=True)[0].total

	total_cost = frappe.db.sql("""
		SELECT COALESCE(SUM(estimated_cost_usd), 0) as total
		FROM `tabAI Audit Log`
		WHERE status = 'Success'
	""", as_dict=True)[0].total

	# Token usage
	month_tokens = frappe.db.sql("""
		SELECT
			COALESCE(SUM(tokens_input), 0) as input_tokens,
			COALESCE(SUM(tokens_output), 0) as output_tokens
		FROM `tabAI Audit Log`
		WHERE creation >= %s AND creation <= %s AND status = 'Success'
	""", (month_start, period_end + " 23:59:59"), as_dict=True)[0]

	# Cache hit rate
	cached_count = frappe.db.sql("""
		SELECT COUNT(*) FROM `tabAI Audit Log`
		WHERE cached = 1 AND creation >= %s AND creation <= %s
	""", (month_start, period_end + " 23:59:59"))[0][0]
	cache_rate = round((cached_count / month_requests * 100) if month_requests > 0 else 0, 1)

	# Error rate
	error_count = frappe.db.sql("""
		SELECT COUNT(*) FROM `tabAI Audit Log`
		WHERE status = 'Error' AND creation >= %s AND creation <= %s
	""", (month_start, period_end + " 23:59:59"))[0][0]
	error_rate = round((error_count / month_requests * 100) if month_requests > 0 else 0, 1)

	# Avg response time (non-cached)
	avg_time = frappe.db.sql("""
		SELECT COALESCE(AVG(response_time), 0) as avg_time
		FROM `tabAI Audit Log`
		WHERE creation >= %s AND creation <= %s AND status = 'Success' AND cached = 0
	""", (month_start, period_end + " 23:59:59"), as_dict=True)[0].avg_time

	# Feature breakdown
	features = frappe.db.sql("""
		SELECT feature, COUNT(*) as count,
			COALESCE(SUM(estimated_cost_usd), 0) as cost
		FROM `tabAI Audit Log`
		WHERE creation >= %s AND creation <= %s
		GROUP BY feature
		ORDER BY count DESC
	""", (month_start, period_end + " 23:59:59"), as_dict=True)

	# Top users
	top_users = frappe.db.sql("""
		SELECT user, COUNT(*) as count,
			COALESCE(SUM(estimated_cost_usd), 0) as cost
		FROM `tabAI Audit Log`
		WHERE creation >= %s AND creation <= %s
		GROUP BY user
		ORDER BY count DESC
		LIMIT 10
	""", (month_start, period_end + " 23:59:59"), as_dict=True)

	# Top doctypes
	top_doctypes = frappe.db.sql("""
		SELECT reference_doctype as doctype, COUNT(*) as count
		FROM `tabAI Audit Log`
		WHERE creation >= %s AND creation <= %s AND reference_doctype != ''
		GROUP BY reference_doctype
		ORDER BY count DESC
		LIMIT 10
	""", (month_start, period_end + " 23:59:59"), as_dict=True)

	# Daily trend (within the selected range)
	trend_start = month_start if from_date else str(add_days(getdate(today), -30))
	daily_trend = frappe.db.sql("""
		SELECT DATE(creation) as date, COUNT(*) as count,
			COALESCE(SUM(estimated_cost_usd), 0) as cost
		FROM `tabAI Audit Log`
		WHERE creation >= %s AND creation <= %s
		GROUP BY DATE(creation)
		ORDER BY date
	""", (trend_start, period_end + " 23:59:59"), as_dict=True)

	# Recent logs
	recent_logs = frappe.get_all("AI Audit Log",
		fields=["name", "user", "feature", "reference_doctype", "reference_name",
				"model_used", "status", "tokens_input", "tokens_output",
				"estimated_cost_usd", "response_time", "cached", "creation"],
		order_by="creation desc",
		limit=20
	)

	# Active users count
	active_users = frappe.db.sql("""
		SELECT COUNT(DISTINCT user) FROM `tabAI Audit Log`
		WHERE creation >= %s AND creation <= %s
	""", (month_start, period_end + " 23:59:59"))[0][0] if month_requests else 0

	return {
		"summary": {
			"total_requests": total_requests,
			"month_requests": month_requests,
			"today_requests": today_requests,
			"month_cost": round(float(month_cost), 4),
			"total_cost": round(float(total_cost), 4),
			"monthly_budget": settings.monthly_budget_usd or 100,
			"budget_used_pct": round(float(month_cost) / (settings.monthly_budget_usd or 100) * 100, 1),
			"input_tokens": int(month_tokens.input_tokens),
			"output_tokens": int(month_tokens.output_tokens),
			"cache_rate": cache_rate,
			"error_rate": error_rate,
			"avg_response_time": round(float(avg_time), 2),
			"provider": settings.provider_type,
			"model": settings.default_model,
			"active_users": active_users,
			"from_date": month_start,
			"to_date": period_end,
		},
		"features": features,
		"top_users": top_users,
		"top_doctypes": top_doctypes,
		"daily_trend": daily_trend,
		"recent_logs": recent_logs,
	}
