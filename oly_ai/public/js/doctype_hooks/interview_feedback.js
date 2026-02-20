// Oly AI — Interview Feedback AI Assist (HRMS)
frappe.ui.form.on("Interview Feedback", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Classify",
			]);
		}
	},
});
