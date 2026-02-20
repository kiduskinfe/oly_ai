// Oly AI — Content AI Assist (Marketing Suite)
frappe.ui.form.on("Content", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Draft",
				"Suggest Headline",
				"Classify",
			]);
		}
	},
});
