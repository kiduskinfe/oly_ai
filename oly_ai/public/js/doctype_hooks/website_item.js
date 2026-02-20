// Oly AI — Website Item AI Assist (Webshop)
frappe.ui.form.on("Website Item", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Draft Description",
				"Suggest SEO",
			]);
		}
	},
});
