app_name = "oly_ai"
app_title = "Oly AI"
app_publisher = "OLY Technologies"
app_description = "AI Assistant for ERPNext — provider-agnostic, upgrade-safe"
app_email = "kidus@oly.et"
app_license = "MIT"

# Required apps
required_apps = ["frappe", "erpnext"]

# JS/CSS includes in Desk
app_include_js = [
    "/assets/oly_ai/js/oly_ai.bundle.js",
]
app_include_css = [
    "/assets/oly_ai/css/ai_panel.css",
]

# DocType JS hooks — AI buttons on key doctypes
doctype_js = {
    "Lead": "public/js/doctype_hooks/lead.js",
    "Opportunity": "public/js/doctype_hooks/opportunity.js",
    "Issue": "public/js/doctype_hooks/issue.js",
    "Quotation": "public/js/doctype_hooks/quotation.js",
    "Task": "public/js/doctype_hooks/task.js",
    "Project": "public/js/doctype_hooks/project.js",
    "Sales Order": "public/js/doctype_hooks/sales_order.js",
    "Sales Invoice": "public/js/doctype_hooks/sales_invoice.js",
}

# Scheduled tasks
scheduler_events = {
    "daily": [
        "oly_ai.core.cost_tracker.reset_daily_counters",
    ],
    "weekly": [
        "oly_ai.core.cost_tracker.generate_weekly_usage_report",
    ],
}

# Fixtures — export AI Prompt Templates
fixtures = [
    {
        "dt": "AI Prompt Template",
        "filters": [["is_standard", "=", 1]],
    },
]
