// Oly AI — Sales Order AI Assist
frappe.ui.form.on("Sales Order", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Draft",
			]);
		}
	},
});
