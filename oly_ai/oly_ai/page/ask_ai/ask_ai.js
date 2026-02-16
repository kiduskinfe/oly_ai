frappe.pages["ask-ai"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Ask AI"),
		single_column: true,
	});

	// ── Force full-screen: override Frappe's page containers ──
	const $wrapper = $(wrapper);
	$wrapper.find(".page-head").hide();
	$wrapper.addClass("ai-page-wrapper");
	// Remove Frappe's constraining wrappers
	$wrapper.find(".page-body").css({
		"margin": "0", "padding": "0", "max-width": "none"
	});
	$wrapper.find(".layout-main").css({
		"margin": "0", "padding": "0", "max-width": "none"
	});
	$wrapper.find(".layout-main-section-wrapper").css({
		"margin": "0", "padding": "0", "max-width": "none"
	});
	$wrapper.find(".layout-main-section").css({
		"margin": "0", "padding": "0", "max-width": "none"
	});
	$wrapper.find(".container").css({
		"max-width": "none", "padding": "0", "width": "100%"
	});
	// Also fix page-container if exists
	$wrapper.find(".page-container").css({
		"max-width": "none", "padding": "0"
	});

	// State
	let current_session = null;
	let sessions_list = [];
	let is_sending = false;
	let sidebar_open = true;

	// ── SVG Icons ──
	const ICONS = {
		plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
		send: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3.478 2.405a.75.75 0 0 0-.926.94l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z"/></svg>`,
		trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
		edit: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
		search: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
		menu: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
		chat: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
		ai: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="var(--primary, #2490ef)" stroke-width="1.5"/><circle cx="12" cy="12" r="4" fill="var(--primary, #2490ef)" opacity="0.3"/><circle cx="12" cy="12" r="2" fill="var(--primary, #2490ef)"/></svg>`,
		copy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
		check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
	};

	const user_initial = (frappe.session.user_fullname || "U").charAt(0).toUpperCase();

	const suggestions = [
		"How do I create a Sales Order?",
		"What is our leave policy?",
		"Explain the purchase workflow",
		"How to submit a timesheet?",
	];

	// ── Build Layout ──
	page.main.html(`
		<div class="ai-chat-app" id="ai-chat-app">
			<!-- SIDEBAR -->
			<div class="ai-sidebar" id="ai-sidebar">
				<div class="ai-sb-top">
					<button class="ai-sb-btn ai-sb-new" id="new-chat-btn">${ICONS.plus}<span>New chat</span></button>
				</div>
				<div class="ai-sb-search">
					<input type="text" id="chat-search" placeholder="Search..." />
				</div>
				<div class="ai-sb-sessions" id="session-list"></div>
				<div class="ai-sb-bottom">
					<div class="ai-sb-user">
						<div class="ai-sb-avatar">${user_initial}</div>
						<span>${frappe.session.user_fullname || frappe.session.user}</span>
					</div>
				</div>
			</div>

			<!-- MAIN AREA -->
			<div class="ai-chat-main" id="ai-chat-main">
				<div class="ai-chat-topbar">
					<button class="ai-topbar-toggle" id="sidebar-toggle">${ICONS.menu}</button>
					<span class="ai-topbar-title" id="ai-topbar-title">New Chat</span>
					<span class="ai-topbar-model">GPT-4o-mini</span>
				</div>

				<div class="ai-chat-messages" id="ai-chat-messages">
					<!-- Welcome -->
					<div class="ai-chat-welcome" id="ai-chat-welcome">
						<div class="ai-cw-icon">${ICONS.ai}</div>
						<h2 class="ai-cw-title">How can I help you today?</h2>
						<div class="ai-cw-grid">
							${suggestions.map(s => `<button class="ai-cw-chip" data-q="${frappe.utils.escape_html(s)}">${s}</button>`).join("")}
						</div>
					</div>
				</div>

				<div class="ai-chat-inputarea">
					<div class="ai-chat-inputbox" id="ai-chat-inputbox">
						<textarea id="ai-input" rows="1" placeholder="Message AI..." maxlength="4000"></textarea>
						<button class="ai-chat-sendbtn" id="ai-send" disabled title="Send">${ICONS.send}</button>
					</div>
					<p class="ai-chat-disclaimer">AI can make mistakes. Verify important information.</p>
				</div>
			</div>
		</div>
	`);

	// ── References ──
	const $app = $("#ai-chat-app");
	const $sidebar = $("#ai-sidebar");
	const $list = $("#session-list");
	const $msgs = $("#ai-chat-messages");
	const $input = $("#ai-input");
	const $send = $("#ai-send");
	const $topTitle = $("#ai-topbar-title");

	// ── Sidebar toggle ──
	$("#sidebar-toggle").on("click", () => {
		sidebar_open = !sidebar_open;
		$app.toggleClass("ai-sidebar-closed", !sidebar_open);
	});

	// ── Load sessions ──
	function load_sessions(search) {
		frappe.xcall("oly_ai.api.chat.get_sessions", { search: search || "", limit: 100 })
			.then((data) => {
				sessions_list = data || [];
				render_sessions();
			});
	}

	function render_sessions() {
		if (!sessions_list.length) {
			$list.html(`<div class="ai-sb-empty">No conversations yet</div>`);
			return;
		}

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
		function grp(label, items) {
			if (!items.length) return "";
			let h = `<div class="ai-sb-group"><div class="ai-sb-label">${label}</div>`;
			items.forEach((s) => {
				const cls = current_session === s.name ? " active" : "";
				h += `<div class="ai-sb-item${cls}" data-name="${s.name}">
					<span class="ai-sb-item-icon">${ICONS.chat}</span>
					<span class="ai-sb-item-title">${frappe.utils.escape_html(s.title)}</span>
					<span class="ai-sb-item-actions">
						<button class="ai-sb-act" data-act="rename" data-name="${s.name}" title="Rename">${ICONS.edit}</button>
						<button class="ai-sb-act" data-act="delete" data-name="${s.name}" title="Delete">${ICONS.trash}</button>
					</span>
				</div>`;
			});
			return h + `</div>`;
		}

		html += grp(__("Today"), groups.today);
		html += grp(__("Yesterday"), groups.yesterday);
		html += grp(__("Previous 7 days"), groups.week);
		html += grp(__("Older"), groups.older);
		$list.html(html);

		$list.find(".ai-sb-item").on("click", function (e) {
			if ($(e.target).closest(".ai-sb-act").length) return;
			open_session($(this).data("name"));
		});

		$list.find(".ai-sb-act").on("click", function (e) {
			e.stopPropagation();
			const act = $(this).data("act");
			const n = $(this).data("name");
			if (act === "delete") delete_session(n);
			if (act === "rename") rename_session(n);
		});
	}

	// ── New chat ──
	$("#new-chat-btn").on("click", new_chat);

	function new_chat() {
		current_session = null;
		$topTitle.text("New Chat");
		$msgs.html(`
			<div class="ai-chat-welcome" id="ai-chat-welcome">
				<div class="ai-cw-icon">${ICONS.ai}</div>
				<h2 class="ai-cw-title">How can I help you today?</h2>
				<div class="ai-cw-grid">
					${suggestions.map(s => `<button class="ai-cw-chip" data-q="${frappe.utils.escape_html(s)}">${s}</button>`).join("")}
				</div>
			</div>
		`);
		wire_suggestions();
		$list.find(".ai-sb-item").removeClass("active");
		$input.focus();
		if (window.innerWidth < 768) {
			sidebar_open = false;
			$app.addClass("ai-sidebar-closed");
		}
	}

	// ── Open session ──
	function open_session(name) {
		current_session = name;
		const s = sessions_list.find(x => x.name === name);
		$topTitle.text(s ? s.title : "Chat");
		$list.find(".ai-sb-item").removeClass("active");
		$list.find(`.ai-sb-item[data-name="${name}"]`).addClass("active");

		if (window.innerWidth < 768) {
			sidebar_open = false;
			$app.addClass("ai-sidebar-closed");
		}

		$msgs.html(`<div class="ai-chat-loading"><div class="ai-typing"><span></span><span></span><span></span></div></div>`);

		frappe.xcall("oly_ai.api.chat.get_messages", { session_name: name })
			.then((msgs) => {
				$msgs.html("");
				if (!msgs || !msgs.length) {
					$msgs.html(`<div class="ai-chat-welcome"><div class="ai-cw-icon">${ICONS.ai}</div><h2 class="ai-cw-title">How can I help you today?</h2></div>`);
					return;
				}
				msgs.forEach(m => render_msg(m.role, m.content, m));
				scroll_bottom();
				$input.focus();
			});
	}

	// ── Delete / Rename ──
	function delete_session(name) {
		frappe.confirm(__("Delete this conversation?"), () => {
			frappe.xcall("oly_ai.api.chat.delete_session", { session_name: name }).then(() => {
				if (current_session === name) new_chat();
				load_sessions();
				frappe.show_alert({ message: __("Deleted"), indicator: "green" });
			});
		});
	}

	function rename_session(name) {
		const s = sessions_list.find(x => x.name === name);
		const d = new frappe.ui.Dialog({
			title: __("Rename Chat"),
			fields: [{ fieldname: "title", fieldtype: "Data", label: __("Title"), default: s ? s.title : "", reqd: 1 }],
			primary_action_label: __("Save"),
			primary_action: (v) => {
				frappe.xcall("oly_ai.api.chat.rename_session", { session_name: name, title: v.title }).then(() => {
					d.hide();
					if (current_session === name) $topTitle.text(v.title);
					load_sessions();
				});
			},
		});
		d.show();
	}

	// ── Send message ──
	function send_message() {
		const q = $input.val().trim();
		if (!q || is_sending) return;
		is_sending = true;
		$send.prop("disabled", true).addClass("sending");
		$input.val("").css("height", "auto");

		function do_send(sid) {
			$msgs.find(".ai-chat-welcome").remove();
			render_msg("user", q);

			const lid = "ld-" + Date.now();
			$msgs.append(`<div class="ai-cm ai-cm-ai" id="${lid}"><div class="ai-cm-avatar ai-cm-avatar-ai">${ICONS.ai}</div><div class="ai-cm-bubble"><div class="ai-typing"><span></span><span></span><span></span></div></div></div>`);
			scroll_bottom();

			frappe.xcall("oly_ai.api.chat.send_message", { session_name: sid, message: q })
				.then((r) => {
					if (r.session_title) $topTitle.text(r.session_title);
					$(`#${lid}`).replaceWith(build_ai_msg(r));
					wire_copy();
					scroll_bottom();
					is_sending = false;
					$send.prop("disabled", false).removeClass("sending");
					$input.focus();
					load_sessions();
				})
				.catch((err) => {
					$(`#${lid}`).replaceWith(`<div class="ai-cm ai-cm-ai"><div class="ai-cm-avatar ai-cm-avatar-err">!</div><div class="ai-cm-bubble ai-cm-error">${err.message || "Something went wrong"}</div></div>`);
					is_sending = false;
					$send.prop("disabled", false).removeClass("sending");
				});
		}

		if (!current_session) {
			frappe.xcall("oly_ai.api.chat.create_session", { title: q.substring(0, 60) }).then((s) => {
				current_session = s.name;
				do_send(s.name);
			});
		} else {
			do_send(current_session);
		}
	}

	// ── Render message ──
	function render_msg(role, content, meta) {
		if (role === "user") {
			$msgs.append(`<div class="ai-cm ai-cm-user"><div class="ai-cm-bubble">${frappe.utils.escape_html(content)}</div><div class="ai-cm-avatar ai-cm-avatar-user">${user_initial}</div></div>`);
		} else {
			$msgs.append(build_ai_msg_from_data(content, meta));
			wire_copy();
		}
	}

	function build_ai_msg(r) {
		let src = "";
		if (r.sources && r.sources.length) {
			src = `<div class="ai-cm-sources">${r.sources.map(s => `<a href="/app/${frappe.router.slug(s.doctype)}/${s.name}" class="ai-cm-src-link">${s.doctype}: ${s.name}</a>`).join(" · ")}</div>`;
		}
		const meta = [r.model, r.cost ? `$${r.cost.toFixed(4)}` : "", r.response_time ? `${r.response_time}s` : ""].filter(Boolean).join(" · ");
		return `<div class="ai-cm ai-cm-ai">
			<div class="ai-cm-avatar ai-cm-avatar-ai">${ICONS.ai}</div>
			<div class="ai-cm-bubble">
				<div class="ai-cm-content">${oly_ai.render_markdown(r.content)}</div>
				${src}
				<div class="ai-cm-footer">
					<button class="ai-cm-copy" data-content="${frappe.utils.escape_html(r.content)}">${ICONS.copy}<span>Copy</span></button>
					${meta ? `<span class="ai-cm-meta">${meta}</span>` : ""}
				</div>
			</div>
		</div>`;
	}

	function build_ai_msg_from_data(content, meta) {
		const m = [meta && meta.model ? meta.model : "", meta && meta.cost ? `$${parseFloat(meta.cost).toFixed(4)}` : ""].filter(Boolean).join(" · ");
		return `<div class="ai-cm ai-cm-ai">
			<div class="ai-cm-avatar ai-cm-avatar-ai">${ICONS.ai}</div>
			<div class="ai-cm-bubble">
				<div class="ai-cm-content">${oly_ai.render_markdown(content)}</div>
				<div class="ai-cm-footer">
					<button class="ai-cm-copy" data-content="${frappe.utils.escape_html(content)}">${ICONS.copy}<span>Copy</span></button>
					${m ? `<span class="ai-cm-meta">${m}</span>` : ""}
				</div>
			</div>
		</div>`;
	}

	function wire_copy() {
		$msgs.find(".ai-cm-copy").off("click").on("click", function () {
			frappe.utils.copy_to_clipboard($(this).data("content"));
			const $b = $(this);
			$b.html(`${ICONS.check}<span>Copied</span>`);
			setTimeout(() => $b.html(`${ICONS.copy}<span>Copy</span>`), 2000);
		});
	}

	function wire_suggestions() {
		$msgs.find(".ai-cw-chip").off("click").on("click", function () {
			$input.val($(this).data("q"));
			send_message();
		});
	}

	function scroll_bottom() {
		setTimeout(() => { const el = $msgs[0]; if (el) el.scrollTop = el.scrollHeight; }, 80);
	}

	// ── Events ──
	$send.on("click", send_message);
	$input.on("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send_message(); } });
	$input.on("input", function () {
		this.style.height = "auto";
		this.style.height = Math.min(this.scrollHeight, 150) + "px";
		$send.prop("disabled", !this.value.trim());
	});
	$("#chat-search").on("input", frappe.utils.debounce(function () { load_sessions($(this).val()); }, 300));

	// ── Init ──
	wire_suggestions();
	load_sessions();
	$input.focus();
};
