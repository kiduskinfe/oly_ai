// Oly AI — Insight AI Assist (Marketing Suite)
frappe.ui.form.on("Insight", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Classify",
				"Suggest Actions",
			]);
		}
	},
});
