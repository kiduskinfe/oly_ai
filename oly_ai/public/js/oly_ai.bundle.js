/* Oly AI — Main JS Bundle
 * Provides the AI Assist panel and helpers for all doctypes.
 * Loaded globally via app_include_js.
 */

frappe.provide("oly_ai");

// ============================================================
// AI Assist Dialog — reusable for all doctypes
// ============================================================
oly_ai.show_assist_dialog = function (frm, feature, custom_prompt) {
	const d = new frappe.ui.Dialog({
		title: __("AI Assist — " + feature),
		size: "large",
		fields: [
			{
				fieldname: "ai_response_area",
				fieldtype: "HTML",
				options: `<div class="ai-loading" style="text-align:center; padding:40px;">
					<div class="spinner-border text-primary" role="status"></div>
					<p class="mt-3 text-muted">${__("Analyzing document...")}</p>
				</div>`,
			},
		],
		primary_action_label: __("Copy to Clipboard"),
		primary_action: function () {
			const content = d._ai_content || "";
			frappe.utils.copy_to_clipboard(content);
			frappe.show_alert({ message: __("Copied!"), indicator: "green" });
		},
		secondary_action_label: __("Add as Comment"),
		secondary_action: function () {
			const content = d._ai_content || "";
			if (!content) return;
			frm.comment_area?.set_value(content);
			frappe.xcall("frappe.desk.form.utils.add_comment", {
				reference_doctype: frm.doctype,
				reference_name: frm.docname,
				content: `<p><strong>[AI ${feature}]</strong></p>${frappe.markdown(content)}`,
				comment_email: frappe.session.user,
			}).then(() => {
				frappe.show_alert({ message: __("Added as comment"), indicator: "green" });
				frm.reload_doc();
			});
		},
	});
	d.show();

	// Call the AI gateway
	frappe
		.xcall("oly_ai.api.gateway.ai_assist", {
			doctype: frm.doctype,
			name: frm.docname,
			feature: feature,
			custom_prompt: custom_prompt || null,
		})
		.then((r) => {
			d._ai_content = r.content;
			const meta_html = `<div class="ai-meta text-muted small mb-2">
				${r.cached ? "⚡ Cached" : `<svg class="es-icon icon-xs"><use href="#es-line-star"></use></svg> ${r.model}`}
				${r.cost ? ` • $${r.cost.toFixed(4)}` : ""}
				${r.response_time ? ` • ${r.response_time}s` : ""}
			</div>`;
			d.fields_dict.ai_response_area.$wrapper.html(
				`${meta_html}<div class="ai-response-content" style="padding:10px; background:var(--bg-light-gray); border-radius:8px; max-height:500px; overflow-y:auto;">${frappe.markdown(r.content)}</div>`
			);
		})
		.catch((err) => {
			d.fields_dict.ai_response_area.$wrapper.html(
				`<div class="text-danger" style="padding:20px;">
					<strong>${__("AI Error")}</strong><br>
					${err.message || __("Something went wrong. Check AI Settings.")}
				</div>`
			);
		});
};

// ============================================================
// Custom prompt dialog
// ============================================================
oly_ai.show_custom_prompt = function (frm) {
	const d = new frappe.ui.Dialog({
		title: __("Ask AI about this document"),
		fields: [
			{
				fieldname: "prompt",
				fieldtype: "Small Text",
				label: __("Your question or instruction"),
				reqd: 1,
				placeholder: __(
					"e.g., Draft a follow-up email, Summarize key risks, What should I do next?"
				),
			},
			{
				fieldname: "feature",
				fieldtype: "Select",
				label: __("Type"),
				options: "Summarize\nTriage\nSuggest Reply\nDraft\nClassify\nCustom",
				default: "Custom",
			},
		],
		primary_action_label: __("Ask AI"),
		primary_action: function (values) {
			d.hide();
			oly_ai.show_assist_dialog(frm, values.feature, values.prompt);
		},
	});
	d.show();
};

// ============================================================
// Add AI menu to form toolbar (universal)
// ============================================================
oly_ai.add_ai_buttons = function (frm, features) {
	if (!features) {
		features = ["Summarize"];
	}

	// Add primary AI button group
	features.forEach((feature) => {
		frm.add_custom_button(
			__(feature),
			function () {
				oly_ai.show_assist_dialog(frm, feature);
			},
			__("AI Assist")
		);
	});

	// Always add "Ask AI..." for custom prompts
	frm.add_custom_button(
		__("Ask AI..."),
		function () {
			oly_ai.show_custom_prompt(frm);
		},
		__("AI Assist")
	);
};

// ============================================================
// Ask ERP — global search bar integration
// ============================================================
oly_ai.ask_erp = function (question) {
	const d = new frappe.ui.Dialog({
		title: __("Ask ERP"),
		size: "large",
		fields: [
			{
				fieldname: "question",
				fieldtype: "Small Text",
				label: __("Ask anything about the system"),
				default: question || "",
				reqd: 1,
				placeholder: __(
					"e.g., What is our leave policy? How do I create a purchase order?"
				),
			},
			{
				fieldname: "response_area",
				fieldtype: "HTML",
				options: "",
			},
		],
		primary_action_label: __("Ask"),
		primary_action: function (values) {
			d.fields_dict.response_area.$wrapper.html(
				`<div class="ai-loading" style="text-align:center; padding:40px;">
					<div class="spinner-border text-primary" role="status"></div>
					<p class="mt-3 text-muted">${__("Thinking...")}</p>
				</div>`
			);
			frappe
				.xcall("oly_ai.api.gateway.ask_erp", {
					question: values.question,
				})
				.then((r) => {
					const meta = `<div class="text-muted small mb-2">${r.cached ? "⚡ Cached" : `<svg class="es-icon icon-xs"><use href="#es-line-star"></use></svg> ${r.model}`}${r.cost ? ` • $${r.cost.toFixed(4)}` : ""}</div>`;
					d.fields_dict.response_area.$wrapper.html(
						`${meta}<div style="padding:12px; background:var(--bg-light-gray); border-radius:8px;">${frappe.markdown(r.content)}</div>`
					);
				})
				.catch((err) => {
					d.fields_dict.response_area.$wrapper.html(
						`<div class="text-danger" style="padding:20px;">${err.message || __("Error")}</div>`
					);
				});
		},
	});
	d.show();
};

// Add Ask ERP to the help menu (navbar)
$(document).ready(function () {
	// Add "Ask ERP" to the navbar
	if (frappe.boot && frappe.boot.user) {
		setTimeout(() => {
			const $navbar = $(".navbar-nav:last");
			if ($navbar.length) {
				const $btn = $(
					`<li class="nav-item">
						<a class="nav-link btn-reset text-muted" href="#" title="${__("Ask ERP (AI)")}" onclick="oly_ai.ask_erp(); return false;">
							<svg class="es-icon icon-sm"><use href="#es-line-star"></use></svg>
						</a>
					</li>`
				);
				$navbar.prepend($btn);
			}
		}, 1000);
	}
});
