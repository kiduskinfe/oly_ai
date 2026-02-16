frappe.pages["ask-ai"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Ask AI"),
		single_column: true,
	});

	// Hide default page head to go full-screen ChatGPT style
	$(wrapper).find(".page-head").hide();

	// State
	let current_session = null;
	let sessions_list = [];
	let is_sending = false;
	let sidebar_collapsed = false;

	// ── SVG Icons (professional, no emojis) ──
	const ICONS = {
		plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
		send: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z"/></svg>`,
		trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
		edit: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
		search: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
		menu: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
		chat: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
		sparkle: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L13.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="var(--primary, #2490ef)" stroke="none" opacity="0.15"/><path d="M12 2L13.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/></svg>`,
		copy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
		check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
		close: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
	};

	const suggestions = [
		{ text: "How do I create a Sales Order?" },
		{ text: "What is our leave policy?" },
		{ text: "Explain the purchase workflow" },
		{ text: "How to submit a timesheet?" },
	];

	// ── Build Main Layout ──
	page.main.html(`
		<div class="ai-chat-app">
			<aside class="ai-sidebar" id="ai-sidebar">
				<div class="ai-sidebar-header">
					<button class="ai-sidebar-toggle" id="sidebar-toggle" title="Toggle sidebar">${ICONS.menu}</button>
					<button class="ai-new-chat-btn" id="new-chat-btn" title="New chat">${ICONS.plus} <span>New Chat</span></button>
				</div>
				<div class="ai-sidebar-search">
					<div class="ai-search-box">
						${ICONS.search}
						<input type="text" id="chat-search" placeholder="Search chats..." />
					</div>
				</div>
				<div class="ai-sidebar-list" id="session-list"></div>
				<div class="ai-sidebar-footer">
					<div class="ai-sidebar-user">
						<div class="ai-user-avatar">${(frappe.session.user_fullname || "U").charAt(0).toUpperCase()}</div>
						<span class="ai-user-name">${frappe.session.user_fullname || frappe.session.user}</span>
					</div>
				</div>
			</aside>
			<main class="ai-main" id="ai-main">
				<div class="ai-main-header" id="ai-main-header">
					<button class="ai-sidebar-toggle ai-mobile-toggle" id="mobile-toggle">${ICONS.menu}</button>
					<span class="ai-main-title" id="ai-main-title">New Chat</span>
				</div>
				<div class="ai-messages-area" id="ai-messages">
					<div class="ai-welcome" id="ai-welcome">
						<div class="ai-welcome-icon">${ICONS.sparkle}</div>
						<h1 class="ai-welcome-title">Ask AI</h1>
						<p class="ai-welcome-sub">Your intelligent assistant for ERPNext</p>
						<div class="ai-suggestions" id="ai-suggestions">
							${suggestions.map(s => `<button class="ai-suggestion" data-q="${frappe.utils.escape_html(s.text)}">${s.text}</button>`).join("")}
						</div>
					</div>
				</div>
				<div class="ai-input-area">
					<div class="ai-input-wrap" id="ai-input-wrap">
						<textarea id="ai-input" rows="1" placeholder="Message AI..."></textarea>
						<button class="ai-send" id="ai-send" disabled>${ICONS.send}</button>
					</div>
					<div class="ai-input-footer">AI may produce inaccurate information. Verify important details.</div>
				</div>
			</main>
		</div>
	`);

	// ── DOM refs ──
	const $app = page.main.find(".ai-chat-app");
	const $sidebar = page.main.find("#ai-sidebar");
	const $list = page.main.find("#session-list");
	const $messages = page.main.find("#ai-messages");
	const $welcome = page.main.find("#ai-welcome");
	const $input = page.main.find("#ai-input");
	const $send = page.main.find("#ai-send");
	const $title = page.main.find("#ai-main-title");
	const $search = page.main.find("#chat-search");

	// ── Sidebar Toggle ──
	page.main.find("#sidebar-toggle, #mobile-toggle").on("click", function () {
		sidebar_collapsed = !sidebar_collapsed;
		$app.toggleClass("sidebar-collapsed", sidebar_collapsed);
	});

	// ── Load Sessions ──
	function load_sessions(search) {
		frappe.xcall("oly_ai.api.chat.get_sessions", { search: search || "", limit: 100 })
			.then((data) => {
				sessions_list = data || [];
				render_session_list();
			});
	}

	function render_session_list() {
		if (!sessions_list.length) {
			$list.html(`<div class="ai-empty-sessions"><p>No conversations yet</p></div>`);
			return;
		}

		// Group by date
		const today = frappe.datetime.get_today();
		const yesterday = frappe.datetime.add_days(today, -1);
		const week_ago = frappe.datetime.add_days(today, -7);
		const groups = { today: [], yesterday: [], week: [], older: [] };

		sessions_list.forEach((s) => {
			const d = s.modified.split(" ")[0];
			if (d === today) groups.today.push(s);
			else if (d === yesterday) groups.yesterday.push(s);
			else if (d >= week_ago) groups.week.push(s);
			else groups.older.push(s);
		});

		let html = "";
		const render_group = (label, items) => {
			if (!items.length) return "";
			let h = `<div class="ai-session-group"><div class="ai-session-group-label">${label}</div>`;
			items.forEach((s) => {
				const active = current_session === s.name ? " active" : "";
				h += `<div class="ai-session-item${active}" data-name="${s.name}">
					<span class="ai-session-icon">${ICONS.chat}</span>
					<span class="ai-session-title">${frappe.utils.escape_html(s.title)}</span>
					<div class="ai-session-actions">
						<button class="ai-session-action" data-action="rename" data-name="${s.name}" title="Rename">${ICONS.edit}</button>
						<button class="ai-session-action" data-action="delete" data-name="${s.name}" title="Delete">${ICONS.trash}</button>
					</div>
				</div>`;
			});
			h += `</div>`;
			return h;
		};

		html += render_group(__("Today"), groups.today);
		html += render_group(__("Yesterday"), groups.yesterday);
		html += render_group(__("Previous 7 days"), groups.week);
		html += render_group(__("Older"), groups.older);
		$list.html(html);

		// Click handler for sessions
		$list.find(".ai-session-item").on("click", function (e) {
			if ($(e.target).closest(".ai-session-action").length) return;
			open_session($(this).data("name"));
		});

		// Action buttons
		$list.find(".ai-session-action").on("click", function (e) {
			e.stopPropagation();
			const action = $(this).data("action");
			const name = $(this).data("name");
			if (action === "delete") delete_session(name);
			if (action === "rename") rename_session(name);
		});
	}

	// ── New Chat ──
	page.main.find("#new-chat-btn").on("click", new_chat);

	function new_chat() {
		current_session = null;
		$title.text("New Chat");
		$messages.html(`
			<div class="ai-welcome" id="ai-welcome">
				<div class="ai-welcome-icon">${ICONS.sparkle}</div>
				<h1 class="ai-welcome-title">Ask AI</h1>
				<p class="ai-welcome-sub">Your intelligent assistant for ERPNext</p>
				<div class="ai-suggestions" id="ai-suggestions">
					${suggestions.map(s => `<button class="ai-suggestion" data-q="${frappe.utils.escape_html(s.text)}">${s.text}</button>`).join("")}
				</div>
			</div>
		`);
		wire_suggestions();
		$list.find(".ai-session-item").removeClass("active");
		$input.focus();
		// Collapse sidebar on mobile
		if (window.innerWidth < 768) {
			sidebar_collapsed = true;
			$app.addClass("sidebar-collapsed");
		}
	}

	// ── Open Session ──
	function open_session(name) {
		current_session = name;
		const session = sessions_list.find((s) => s.name === name);
		$title.text(session ? session.title : "Chat");

		// Mark active
		$list.find(".ai-session-item").removeClass("active");
		$list.find(`.ai-session-item[data-name="${name}"]`).addClass("active");

		// Collapse sidebar on mobile
		if (window.innerWidth < 768) {
			sidebar_collapsed = true;
			$app.addClass("sidebar-collapsed");
		}

		// Load messages
		$messages.html(`<div class="ai-loading-messages"><div class="ai-typing-indicator"><span></span><span></span><span></span></div></div>`);

		frappe.xcall("oly_ai.api.chat.get_messages", { session_name: name })
			.then((msgs) => {
				$messages.html("");
				if (!msgs || !msgs.length) {
					$messages.html(`<div class="ai-welcome" id="ai-welcome">
						<div class="ai-welcome-icon">${ICONS.sparkle}</div>
						<h1 class="ai-welcome-title">Ask AI</h1>
						<p class="ai-welcome-sub">Your intelligent assistant for ERPNext</p>
					</div>`);
					return;
				}
				msgs.forEach((m) => append_message(m.role, m.content, m));
				scroll_to_bottom();
				$input.focus();
			});
	}

	// ── Delete Session ──
	function delete_session(name) {
		frappe.confirm(__("Delete this conversation?"), () => {
			frappe.xcall("oly_ai.api.chat.delete_session", { session_name: name })
				.then(() => {
					if (current_session === name) new_chat();
					load_sessions();
					frappe.show_alert({ message: __("Deleted"), indicator: "green" });
				});
		});
	}

	// ── Rename Session ──
	function rename_session(name) {
		const session = sessions_list.find((s) => s.name === name);
		const d = new frappe.ui.Dialog({
			title: __("Rename Chat"),
			fields: [
				{
					fieldname: "title",
					fieldtype: "Data",
					label: __("Title"),
					default: session ? session.title : "",
					reqd: 1,
				},
			],
			primary_action_label: __("Save"),
			primary_action: (values) => {
				frappe.xcall("oly_ai.api.chat.rename_session", {
					session_name: name,
					title: values.title,
				}).then(() => {
					d.hide();
					if (current_session === name) $title.text(values.title);
					load_sessions();
				});
			},
		});
		d.show();
	}

	// ── Send Message ──
	function send_message() {
		const q = $input.val().trim();
		if (!q || is_sending) return;

		is_sending = true;
		$send.prop("disabled", true).addClass("sending");
		$input.val("").trigger("input");

		function do_send(session_name) {
			// Hide welcome
			$messages.find(".ai-welcome").remove();

			// Show user message
			append_message("user", q);

			// Show typing indicator
			const loading_id = "loading-" + Date.now();
			$messages.append(`
				<div class="ai-msg ai-msg-assistant" id="${loading_id}">
					<div class="ai-msg-avatar ai-avatar-ai">${ICONS.sparkle}</div>
					<div class="ai-msg-body">
						<div class="ai-typing-indicator"><span></span><span></span><span></span></div>
					</div>
				</div>
			`);
			scroll_to_bottom();

			frappe.xcall("oly_ai.api.chat.send_message", {
				session_name: session_name,
				message: q,
			})
			.then((r) => {
				// Update title if auto-generated
				if (r.session_title) {
					$title.text(r.session_title);
				}

				// Replace loading with response
				const $loading = page.main.find(`#${loading_id}`);
				$loading.replaceWith(build_assistant_message(r));

				// Wire copy buttons
				wire_copy_buttons();
				scroll_to_bottom();

				is_sending = false;
				$send.prop("disabled", false).removeClass("sending");
				$input.focus();

				// Refresh sidebar
				load_sessions();
			})
			.catch((err) => {
				page.main.find(`#${loading_id}`).replaceWith(`
					<div class="ai-msg ai-msg-assistant">
						<div class="ai-msg-avatar ai-avatar-error">!</div>
						<div class="ai-msg-body ai-msg-error">
							<strong>${__("Error")}</strong>: ${err.message || __("Something went wrong. Please try again.")}
						</div>
					</div>
				`);
				is_sending = false;
				$send.prop("disabled", false).removeClass("sending");
			});
		}

		// Create session if needed
		if (!current_session) {
			frappe.xcall("oly_ai.api.chat.create_session", { title: q.substring(0, 60) })
				.then((s) => {
					current_session = s.name;
					do_send(s.name);
				});
		} else {
			do_send(current_session);
		}
	}

	// ── Append Message to UI ──
	function append_message(role, content, meta) {
		if (role === "user") {
			$messages.append(`
				<div class="ai-msg ai-msg-user">
					<div class="ai-msg-body">${frappe.utils.escape_html(content)}</div>
					<div class="ai-msg-avatar ai-avatar-user">${(frappe.session.user_fullname || "U").charAt(0).toUpperCase()}</div>
				</div>
			`);
		} else {
			$messages.append(build_assistant_message_from_data(content, meta));
			wire_copy_buttons();
		}
	}

	function build_assistant_message(r) {
		let sources_html = "";
		if (r.sources && r.sources.length) {
			sources_html = `<div class="ai-msg-sources"><span class="ai-sources-label">Sources:</span> `;
			sources_html += r.sources.map(s =>
				`<a href="/app/${frappe.router.slug(s.doctype)}/${s.name}" class="ai-source-tag">${s.doctype}: ${s.name}</a>`
			).join("");
			sources_html += `</div>`;
		}

		const meta_parts = [];
		if (r.model) meta_parts.push(r.model);
		if (r.cost) meta_parts.push(`$${r.cost.toFixed(4)}`);
		if (r.response_time) meta_parts.push(`${r.response_time}s`);

		return `<div class="ai-msg ai-msg-assistant">
			<div class="ai-msg-avatar ai-avatar-ai">${ICONS.sparkle}</div>
			<div class="ai-msg-body">
				${oly_ai.render_markdown(r.content)}
				${sources_html}
				<div class="ai-msg-actions">
					<button class="ai-action-btn ai-copy-response" data-content="${frappe.utils.escape_html(r.content)}" title="Copy">${ICONS.copy} Copy</button>
					${meta_parts.length ? `<span class="ai-msg-meta">${meta_parts.join(" · ")}</span>` : ""}
				</div>
			</div>
		</div>`;
	}

	function build_assistant_message_from_data(content, meta) {
		const meta_parts = [];
		if (meta && meta.model) meta_parts.push(meta.model);
		if (meta && meta.cost) meta_parts.push(`$${parseFloat(meta.cost).toFixed(4)}`);

		return `<div class="ai-msg ai-msg-assistant">
			<div class="ai-msg-avatar ai-avatar-ai">${ICONS.sparkle}</div>
			<div class="ai-msg-body">
				${oly_ai.render_markdown(content)}
				<div class="ai-msg-actions">
					<button class="ai-action-btn ai-copy-response" data-content="${frappe.utils.escape_html(content)}" title="Copy">${ICONS.copy} Copy</button>
					${meta_parts.length ? `<span class="ai-msg-meta">${meta_parts.join(" · ")}</span>` : ""}
				</div>
			</div>
		</div>`;
	}

	function wire_copy_buttons() {
		page.main.find(".ai-copy-response").off("click").on("click", function () {
			const content = $(this).data("content");
			frappe.utils.copy_to_clipboard(content);
			const $btn = $(this);
			$btn.html(`${ICONS.check} Copied`);
			setTimeout(() => $btn.html(`${ICONS.copy} Copy`), 2000);
		});
	}

	function wire_suggestions() {
		page.main.find(".ai-suggestion").off("click").on("click", function () {
			$input.val($(this).data("q"));
			send_message();
		});
	}

	function scroll_to_bottom() {
		setTimeout(() => {
			const el = $messages[0];
			if (el) el.scrollTop = el.scrollHeight;
		}, 100);
	}

	// ── Event Listeners ──
	$send.on("click", send_message);

	$input.on("keydown", function (e) {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			send_message();
		}
	});

	$input.on("input", function () {
		this.style.height = "auto";
		this.style.height = Math.min(this.scrollHeight, 150) + "px";
		$send.prop("disabled", !this.value.trim());
	});

	$search.on("input", frappe.utils.debounce(function () {
		load_sessions($(this).val());
	}, 300));

	// ── Init ──
	wire_suggestions();
	load_sessions();
	$input.focus();
};
