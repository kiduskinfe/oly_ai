/* Oly AI — Main JS Bundle
 * Provides the AI Assist panel, Ask AI chat, and helpers for all doctypes.
 * Loaded globally via app_include_js.
 */

frappe.provide("oly_ai");

// ============================================================
// Markdown renderer helper — renders AI markdown to styled HTML
// ============================================================
oly_ai.render_markdown = function (md_text) {
	if (!md_text) return "";
	// Use Frappe's built-in markdown renderer
	let html = frappe.markdown(md_text);
	// Wrap in styled container
	return `<div class="ai-response-content">${html}</div>`;
};

// ============================================================
// Response meta bar — shows model, cost, timing, copy button
// ============================================================
oly_ai._build_meta_bar = function (r, include_copy) {
	const parts = [];
	if (r.cached) {
		parts.push('<span class="ai-meta-badge ai-meta-cached">⚡ Cached</span>');
	} else {
		if (r.model) parts.push(`<span class="ai-meta-badge">${r.model}</span>`);
	}
	if (r.cost) parts.push(`<span class="ai-meta-item">$${r.cost.toFixed(4)}</span>`);
	if (r.response_time) parts.push(`<span class="ai-meta-item">${r.response_time}s</span>`);
	if (r.tokens) parts.push(`<span class="ai-meta-item">${r.tokens} tokens</span>`);

	let copy_btn = "";
	if (include_copy) {
		copy_btn = `<button class="btn btn-xs btn-default ai-copy-btn" title="${__("Copy")}">
			<svg class="es-icon icon-xs"><use href="#es-line-copy"></use></svg> ${__("Copy")}
		</button>`;
	}

	return `<div class="ai-meta-bar">${parts.join('<span class="ai-meta-sep">•</span>')}${copy_btn}</div>`;
};

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
				options: `<div class="ai-loading">
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
			const meta_html = oly_ai._build_meta_bar(r, true);
			d.fields_dict.ai_response_area.$wrapper.html(
				`${meta_html}<div class="ai-response-box">${oly_ai.render_markdown(r.content)}</div>`
			);
			// Wire up inline copy button
			d.$wrapper.find(".ai-copy-btn").on("click", function () {
				frappe.utils.copy_to_clipboard(d._ai_content || "");
				frappe.show_alert({ message: __("Copied!"), indicator: "green" });
			});
		})
		.catch((err) => {
			d.fields_dict.ai_response_area.$wrapper.html(
				`<div class="ai-error">
					<svg class="es-icon icon-sm"><use href="#es-line-alert-circle"></use></svg>
					<strong>${__("AI Error")}</strong><br>
					<span class="text-muted">${err.message || __("Something went wrong. Check AI Settings.")}</span>
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
// Ask AI — navbar dialog with multi-turn conversation
// ============================================================
oly_ai.ask_erp = function (question) {
	const d = new frappe.ui.Dialog({
		title: __("Ask AI"),
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
				`<div class="ai-loading">
					<div class="spinner-border text-primary" role="status"></div>
					<p class="mt-3 text-muted">${__("Thinking...")}</p>
				</div>`
			);
			d.disable_primary_action();
			frappe
				.xcall("oly_ai.api.gateway.ask_erp", {
					question: values.question,
				})
				.then((r) => {
					d._ai_content = r.content;
					const meta = oly_ai._build_meta_bar(r, true);
					d.fields_dict.response_area.$wrapper.html(
						`${meta}<div class="ai-response-box">${oly_ai.render_markdown(r.content)}</div>`
					);
					// Wire up copy button
					d.$wrapper.find(".ai-copy-btn").on("click", function () {
						frappe.utils.copy_to_clipboard(d._ai_content || "");
						frappe.show_alert({ message: __("Copied!"), indicator: "green" });
					});
					// Clear question for follow-up
					d.set_value("question", "");
					d.enable_primary_action();
				})
				.catch((err) => {
					d.fields_dict.response_area.$wrapper.html(
						`<div class="ai-error">
							<svg class="es-icon icon-sm"><use href="#es-line-alert-circle"></use></svg>
							${err.message || __("Error")}
						</div>`
					);
					d.enable_primary_action();
				});
		},
	});
	d.show();
	d.$wrapper.find(".modal-dialog").addClass("oly-ai-dialog");
};

// Add Ask AI to the navbar
$(document).ready(function () {
	if (frappe.boot && frappe.boot.user) {
		setTimeout(() => {
			const $navbar = $(".navbar-nav:last");
			if ($navbar.length) {
				const $btn = $(
					`<li class="nav-item">
						<a class="nav-link btn-reset text-muted" href="/app/ask-ai" title="${__("Ask AI")}">
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
								<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
							</svg>
						</a>
					</li>`
				);
				$navbar.prepend($btn);
			}
		}, 1000);
	}
});
