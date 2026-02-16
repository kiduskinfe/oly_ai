// Oly AI — Purchase Order AI Assist
frappe.ui.form.on("Purchase Order", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Triage",
				"Draft",
			]);
		}
	},
});
