// Oly AI — Media Outlet AI Assist (Marketing Suite)
frappe.ui.form.on("Media Outlet", {
	refresh(frm) {
		if (frm.doc.docstatus < 2) {
			oly_ai.add_ai_buttons(frm, [
				"Summarize",
				"Analyze",
			]);
		}
	},
});
