// Oly AI — Opportunity AI Assist
frappe.ui.form.on("Opportunity", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Triage",
				"Draft",
				"Classify",
			]);
		}
	},
});
