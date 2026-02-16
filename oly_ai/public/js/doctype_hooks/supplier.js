// Oly AI — Supplier AI Assist
frappe.ui.form.on("Supplier", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Classify",
				"Draft",
			]);
		}
	},
});
