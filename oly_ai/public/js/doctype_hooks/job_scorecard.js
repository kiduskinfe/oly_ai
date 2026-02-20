// Oly AI — Job Scorecard AI Assist (Oly)
frappe.ui.form.on("Job Scorecard", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Analyze",
			]);
		}
	},
});
