// Oly AI — Salary Slip AI Assist (HRMS)
frappe.ui.form.on("Salary Slip", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Analyze",
			]);
		}
	},
});
