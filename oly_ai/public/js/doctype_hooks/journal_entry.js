// Oly AI — Journal Entry AI Assist
frappe.ui.form.on("Journal Entry", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Classify",
			]);
		}
	},
});
