// Oly AI — Letter AI Assist (Oly)
frappe.ui.form.on("Letter", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Draft",
				"Translate",
			]);
		}
	},
});
