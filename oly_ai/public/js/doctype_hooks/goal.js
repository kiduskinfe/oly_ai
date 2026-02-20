// Oly AI — Goal AI Assist (HRMS)
frappe.ui.form.on("Goal", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Draft",
			]);
		}
	},
});
