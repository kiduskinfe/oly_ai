// Oly AI — Lead AI Assist
frappe.ui.form.on("Lead", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Triage",
				"Suggest Reply",
				"Draft",
			]);
		}
	},
});
