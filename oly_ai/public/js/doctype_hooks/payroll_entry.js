// Oly AI — Payroll Entry AI Assist (HRMS)
frappe.ui.form.on("Payroll Entry", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Analyze",
			]);
		}
	},
});
