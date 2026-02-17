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
    "Employee": "public/js/doctype_hooks/employee.js",
    "Purchase Order": "public/js/doctype_hooks/purchase_order.js",
    "Purchase Invoice": "public/js/doctype_hooks/purchase_invoice.js",
    "Leave Application": "public/js/doctype_hooks/leave_application.js",
    "Customer": "public/js/doctype_hooks/customer.js",
    "Supplier": "public/js/doctype_hooks/supplier.js",
    "Expense Claim": "public/js/doctype_hooks/expense_claim.js",
    "Journal Entry": "public/js/doctype_hooks/journal_entry.js",
    "Payment Entry": "public/js/doctype_hooks/payment_entry.js",
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
}

# Fixtures — export AI Prompt Templates
fixtures = [
    {
        "dt": "AI Prompt Template",
        "filters": [["is_standard", "=", 1]],
    },
]
