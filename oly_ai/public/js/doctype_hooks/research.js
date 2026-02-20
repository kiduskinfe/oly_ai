// Oly AI — Research AI Assist (Marketing Suite)
frappe.ui.form.on("Research", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Analyze",
			]);
		}
	},
});
