// Oly AI — Project AI Assist
frappe.ui.form.on("Project", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Draft",
			]);
		}
	},
});
