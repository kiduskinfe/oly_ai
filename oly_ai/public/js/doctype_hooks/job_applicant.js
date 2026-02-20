// Oly AI — Job Applicant AI Assist (HRMS)
frappe.ui.form.on("Job Applicant", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Triage",
				"Classify",
			]);
		}
	},
});
