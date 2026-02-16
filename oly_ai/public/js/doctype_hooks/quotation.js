// Oly AI — Quotation AI Assist
frappe.ui.form.on("Quotation", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Draft",
			]);
		}
	},
});
