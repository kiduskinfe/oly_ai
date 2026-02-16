// Oly AI — Expense Claim AI Assist
frappe.ui.form.on("Expense Claim", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Triage",
				"Classify",
			]);
		}
	},
});
