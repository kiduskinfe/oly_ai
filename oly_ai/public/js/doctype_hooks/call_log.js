// Oly AI — Call Log AI Assist (Oly)
frappe.ui.form.on("Call Log", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Classify",
				"Suggest Follow-up",
			]);
		}
	},
});
