// Oly AI — Telegram Chat AI Assist (Oly)
frappe.ui.form.on("Telegram Chat", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Suggest Reply",
				"Classify",
			]);
		}
	},
});
