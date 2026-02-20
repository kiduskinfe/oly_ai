app_name = "oly_ai"
app_title = "Oly AI"
app_publisher = "OLY Technologies"
app_description = "AI Assistant for ERPNext — provider-agnostic, upgrade-safe"
app_email = "kidus@oly.et"
app_license = "MIT"

# Required apps
required_apps = ["frappe", "erpnext"]

# Post-install setup
after_install = "oly_ai.setup.after_install"

# JS/CSS includes in Desk
app_include_js = "oly_ai.bundle.js"
app_include_css = "/assets/oly_ai/css/ai_panel.css"

# Pass AI branding settings to frontend
extend_bootinfo = "oly_ai.boot.extend_bootinfo"

# DocType JS hooks — AI buttons on key doctypes (across all installed apps)
doctype_js = {
	# ─── ERPNext Core ─────────────────────────────────────────
	"Lead": "public/js/doctype_hooks/lead.js",
	"Opportunity": "public/js/doctype_hooks/opportunity.js",
	"Issue": "public/js/doctype_hooks/issue.js",
	"Quotation": "public/js/doctype_hooks/quotation.js",
	"Task": "public/js/doctype_hooks/task.js",
	"Project": "public/js/doctype_hooks/project.js",
	"Sales Order": "public/js/doctype_hooks/sales_order.js",
	"Sales Invoice": "public/js/doctype_hooks/sales_invoice.js",
	"Employee": "public/js/doctype_hooks/employee.js",
	"Purchase Order": "public/js/doctype_hooks/purchase_order.js",
	"Purchase Invoice": "public/js/doctype_hooks/purchase_invoice.js",
	"Leave Application": "public/js/doctype_hooks/leave_application.js",
	"Customer": "public/js/doctype_hooks/customer.js",
	"Supplier": "public/js/doctype_hooks/supplier.js",
	"Expense Claim": "public/js/doctype_hooks/expense_claim.js",
	"Journal Entry": "public/js/doctype_hooks/journal_entry.js",
	"Payment Entry": "public/js/doctype_hooks/payment_entry.js",
	# ─── Marketing Suite ──────────────────────────────────────
	"Content": "public/js/doctype_hooks/content.js",
	"Ad Campaign": "public/js/doctype_hooks/ad_campaign.js",
	"Insight": "public/js/doctype_hooks/insight.js",
	"Research": "public/js/doctype_hooks/research.js",
	"Competitor": "public/js/doctype_hooks/competitor.js",
	"Influencer": "public/js/doctype_hooks/influencer.js",
	"Brand Profile": "public/js/doctype_hooks/brand_profile.js",
	"Media Outlet": "public/js/doctype_hooks/media_outlet.js",
	"Sponsor": "public/js/doctype_hooks/sponsor.js",
	# ─── HRMS ─────────────────────────────────────────────────
	"Job Applicant": "public/js/doctype_hooks/job_applicant.js",
	"Job Opening": "public/js/doctype_hooks/job_opening.js",
	"Appraisal": "public/js/doctype_hooks/appraisal.js",
	"Employee Grievance": "public/js/doctype_hooks/employee_grievance.js",
	"Interview Feedback": "public/js/doctype_hooks/interview_feedback.js",
	"Salary Slip": "public/js/doctype_hooks/salary_slip.js",
	"Payroll Entry": "public/js/doctype_hooks/payroll_entry.js",
	"Travel Request": "public/js/doctype_hooks/travel_request.js",
	"Goal": "public/js/doctype_hooks/goal.js",
	# ─── Oly (Custom) ────────────────────────────────────────
	"Letter": "public/js/doctype_hooks/letter.js",
	"Daily Work Report": "public/js/doctype_hooks/daily_work_report.js",
	"Telegram Chat": "public/js/doctype_hooks/telegram_chat.js",
	"Call Log": "public/js/doctype_hooks/call_log.js",
	"Feedback": "public/js/doctype_hooks/feedback.js",
	"Job Scorecard": "public/js/doctype_hooks/job_scorecard.js",
	# ─── Webshop ──────────────────────────────────────────────
	"Website Item": "public/js/doctype_hooks/website_item.js",
	"Item Review": "public/js/doctype_hooks/item_review.js",
}

# Scheduled tasks
scheduler_events = {
    "daily": [
        "oly_ai.core.cost_tracker.reset_daily_counters",
        "oly_ai.core.notifications.send_daily_digest",
    ],
    "daily_long": [
        "oly_ai.api.train.scheduled_reindex",
    ],
    "weekly": [
        "oly_ai.core.cost_tracker.generate_weekly_usage_report",
    ],
    "cron": {
        "*/15 * * * *": [
            "oly_ai.core.workflow_engine.run_scheduled_workflows",
        ],
        "*/30 * * * *": [
            "oly_ai.core.sla_monitor.check_sla_status",
        ],
    },
}

# Auto-reindex hooks — triggered on document changes
# Uses a wildcard (*) so it fires for ALL doctypes.
# The handler checks if the DocType is in the indexed_doctypes list.
doc_events = {
    "*": {
        "on_update": "oly_ai.api.train.auto_index_on_update",
        "after_insert": "oly_ai.api.train.auto_index_on_insert",
        "on_trash": "oly_ai.api.train.auto_index_on_trash",
    },
    "Communication": {
        "after_insert": "oly_ai.core.email_handler.on_incoming_communication",
    },
}

# Fixtures — export AI Prompt Templates
fixtures = [
    {
        "dt": "AI Prompt Template",
        "filters": [["is_standard", "=", 1]],
    },
]
