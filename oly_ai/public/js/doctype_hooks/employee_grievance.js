// Oly AI — Employee Grievance AI Assist (HRMS)
frappe.ui.form.on("Employee Grievance", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Triage",
				"Classify",
				"Suggest Resolution",
			]);
		}
	},
});
