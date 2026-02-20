// Oly AI — Feedback AI Assist (Oly)
frappe.ui.form.on("Feedback", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Triage",
				"Classify",
				"Suggest Reply",
			]);
		}
	},
});
