frappe.pages["ask-ai"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Ask AI"),
		single_column: true,
	});

	// Track conversation for potential multi-turn
	page._conversation = [];

	const suggestion_chips = [
		"How do I create a Sales Order?",
		"What is our leave policy?",
		"Explain the purchase workflow",
		"How to submit a timesheet?",
		"What reports are available for HR?",
		"How to set up a new employee?",
	];

	const chips_html = suggestion_chips
		.map(
			(q) =>
				`<button class="ask-ai-suggestion-chip" data-question="${frappe.utils.escape_html(q)}">${q}</button>`
		)
		.join("");

	page.main.html(`
		<div class="ask-ai-page">
			<div class="ask-ai-header">
				<h1>Ask AI</h1>
				<p>${__("Your AI assistant for ERPNext — ask about processes, policies, and how-to questions")}</p>
			</div>
			<div class="ask-ai-suggestions">${chips_html}</div>
			<div class="ask-ai-conversation" id="ai-conversation"></div>
			<div class="ask-ai-input-row">
				<textarea id="ai-question-input" rows="1"
					placeholder="${__("Ask anything about ERPNext, company policies, or workflows...")}"
				></textarea>
				<button class="btn btn-primary ask-ai-send-btn" id="ai-send-btn">
					${__("Ask")}
				</button>
			</div>
		</div>
	`);

	// Wire up send
	const $input = page.main.find("#ai-question-input");
	const $send = page.main.find("#ai-send-btn");
	const $conv = page.main.find("#ai-conversation");

	function send_question() {
		const q = $input.val().trim();
		if (!q) return;

		// Show user message
		$conv.append(
			`<div class="ask-ai-msg ask-ai-msg-user">${frappe.utils.escape_html(q)}</div>`
		);

		// Clear input
		$input.val("").trigger("input");

		// Hide suggestions
		page.main.find(".ask-ai-suggestions").hide();

		// Show loading
		const $loading_id = "ai-loading-" + Date.now();
		$conv.append(
			`<div class="ask-ai-msg ask-ai-msg-ai" id="${$loading_id}">
				<div class="ai-loading" style="padding:20px;">
					<div class="spinner-border spinner-border-sm text-primary" role="status"></div>
					<span class="ms-2 text-muted">${__("Thinking...")}</span>
				</div>
			</div>`
		);

		// Scroll to bottom
		scroll_to_bottom();

		$send.prop("disabled", true);

		frappe
			.xcall("oly_ai.api.gateway.ask_erp", { question: q })
			.then((r) => {
				page._conversation.push({ q: q, a: r.content });

				const meta = oly_ai._build_meta_bar(r, true);

				// Build sources section if RAG returned references
				let sources_html = "";
				if (r.sources && r.sources.length) {
					sources_html = `<div class="ai-sources"><strong>${__("Sources")}:</strong> `;
					sources_html += r.sources
						.map(
							(s) =>
								`<a href="/app/${frappe.router.slug(s.doctype)}/${s.name}" class="ai-source-link">${s.doctype}: ${s.name}</a>`
						)
						.join(", ");
					sources_html += `</div>`;
				}

				const $msg = page.main.find(`#${$loading_id}`);
				$msg.html(
					`${meta}${oly_ai.render_markdown(r.content)}${sources_html}`
				);

				// Wire copy button
				$msg.find(".ai-copy-btn").on("click", function () {
					frappe.utils.copy_to_clipboard(r.content);
					frappe.show_alert({
						message: __("Copied!"),
						indicator: "green",
					});
				});

				scroll_to_bottom();
				$send.prop("disabled", false);
				$input.focus();
			})
			.catch((err) => {
				page.main.find(`#${$loading_id}`).html(
					`<div class="ai-error">
						<strong>${__("Error")}</strong>: ${err.message || __("Something went wrong")}
					</div>`
				);
				$send.prop("disabled", false);
			});
	}

	$send.on("click", send_question);

	$input.on("keydown", function (e) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			send_question();
		}
	});

	// Auto-resize textarea
	$input.on("input", function () {
		this.style.height = "auto";
		this.style.height = Math.min(this.scrollHeight, 120) + "px";
	});

	// Suggestion chips
	page.main.find(".ask-ai-suggestion-chip").on("click", function () {
		$input.val($(this).data("question"));
		send_question();
	});

	function scroll_to_bottom() {
		setTimeout(() => {
			const conv = $conv[0];
			if (conv) conv.scrollTop = conv.scrollHeight;
			// Also scroll the page
			window.scrollTo(0, document.body.scrollHeight);
		}, 100);
	}

	$input.focus();
};
