// Oly AI — Task AI Assist
frappe.ui.form.on("Task", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Draft",
			]);
		}
	},
});
