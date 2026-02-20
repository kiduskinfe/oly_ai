// Oly AI — Item Review AI Assist (Webshop)
frappe.ui.form.on("Item Review", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Classify",
				"Suggest Reply",
			]);
		}
	},
});
