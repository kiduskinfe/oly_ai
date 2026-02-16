// Oly AI — Leave Application AI Assist
frappe.ui.form.on("Leave Application", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Triage",
			]);
		}
	},
});
