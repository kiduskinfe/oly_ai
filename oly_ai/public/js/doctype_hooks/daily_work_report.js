// Oly AI — Daily Work Report AI Assist (Oly)
frappe.ui.form.on("Daily Work Report", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Analyze",
			]);
		}
	},
});
