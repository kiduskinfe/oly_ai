// Oly AI — Employee AI Assist
frappe.ui.form.on("Employee", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Classify",
			]);
		}
	},
});
