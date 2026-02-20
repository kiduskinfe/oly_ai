// Oly AI — Ad Campaign AI Assist (Marketing Suite)
frappe.ui.form.on("Ad Campaign", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Analyze",
				"Suggest Optimization",
			]);
		}
	},
});
