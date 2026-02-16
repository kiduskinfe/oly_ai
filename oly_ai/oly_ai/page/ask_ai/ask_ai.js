/* Ask AI — Full Page Experience
 * Uses shared classes from oly_ai.bundle.js (oly_ai.ICON, oly_ai.render_markdown)
 * Layout: Sidebar + Main chat area, styled with oly-fp-* and shared oly-m-* classes
 */
frappe.pages["ask-ai"].on_page_load = function (wrapper) {
const page = frappe.ui.make_app_page({
parent: wrapper,
title: __("Ask AI"),
single_column: true,
});

// Force full-bleed: hide Frappe page-head and add override class
const $w = $(wrapper);
$w.find(".page-head").hide();
$w.addClass("ai-page-wrapper");

// State
let current_session = null;
let sessions = [];
let sending = false;
let sidebar_open = true;

// Icons from globally loaded bundle
const I = oly_ai.ICON;
const user_init = (frappe.session.user_fullname || "U").charAt(0).toUpperCase();

const suggestions = [
__("How do I create a Sales Order?"),
__("What is our leave policy?"),
__("Explain the purchase workflow"),
__("How to submit a timesheet?"),
];

// ── Build Layout ──
page.main.html([
'<div class="oly-fp" id="oly-fp">',
// Sidebar
'  <div class="oly-fp-sidebar" id="oly-fp-sidebar">',
'    <div class="oly-fp-sb-top">',
'      <button class="oly-fp-sb-new" id="fp-new">' + I.plus + '<span>' + __("New chat") + '</span></button>',
'    </div>',
'    <div class="oly-fp-sb-search">',
'      <input type="text" id="fp-search" placeholder="' + __("Search...") + '" />',
'    </div>',
'    <div class="oly-fp-sb-list" id="fp-list"></div>',
'    <div class="oly-fp-sb-bottom">',
'      <div class="oly-fp-sb-user">',
'        <div class="oly-fp-sb-avatar">' + user_init + '</div>',
'        <span>' + (frappe.session.user_fullname || frappe.session.user) + '</span>',
'      </div>',
'    </div>',
'  </div>',
// Main chat
'  <div class="oly-fp-main">',
'    <div class="oly-fp-head">',
'      <button class="oly-fp-toggle" id="fp-toggle" title="' + __("Toggle sidebar") + '">' + I.menu + '</button>',
'      <span class="oly-fp-title" id="fp-title">' + __("New Chat") + '</span>',
'      <span class="oly-fp-model">GPT-4o-mini</span>',
'    </div>',
'    <div class="oly-fp-msgs" id="fp-msgs"></div>',
'    <div class="oly-fp-inputarea">',
'      <div class="oly-input-wrap" style="max-width:850px;margin:0 auto;">',
'        <textarea id="fp-input" rows="1" placeholder="' + __("Message AI...") + '" maxlength="4000"></textarea>',
'        <button class="oly-input-send" id="fp-send" disabled>' + I.send + '</button>',
'      </div>',
'      <p class="oly-fp-disclaimer">' + __("AI can make mistakes. Verify important information.") + '</p>',
'    </div>',
'  </div>',
'</div>',
].join("\n"));

const $fp = $("#oly-fp");
const $list = $("#fp-list");
const $msgs = $("#fp-msgs");
const $input = $("#fp-input");
const $send = $("#fp-send");
const $title = $("#fp-title");

// ── Welcome Screen ──
function show_welcome() {
$msgs.html([
'<div class="oly-welcome">',
'  <div class="oly-welcome-icon">' + I.sparkles_lg + '</div>',
'  <h2>' + __("How can I help you today?") + '</h2>',
'  <div class="oly-chips oly-chips-grid">',
suggestions.map(function (s) { return '<button class="oly-chip">' + s + '</button>'; }).join(""),
'  </div>',
'</div>',
].join("\n"));
$msgs.find(".oly-chip").on("click", function () {
$input.val($(this).text().trim());
send_message();
});
}

// ── Session List ──
function load_sessions() {
frappe.xcall("oly_ai.api.chat.get_sessions").then(function (data) {
sessions = data || [];
render_sessions(sessions);
});
}

function render_sessions(list) {
if (!list.length) {
$list.html('<div class="oly-fp-sb-empty">' + __("No conversations yet") + '</div>');
return;
}
var groups = group_by_date(list);
var html = "";
groups.forEach(function (g) {
html += '<div class="oly-fp-sb-group">';
html += '<div class="oly-fp-sb-label">' + g.label + '</div>';
g.items.forEach(function (s) {
var active = current_session === s.name ? " active" : "";
html += '<div class="oly-fp-sb-item' + active + '" data-name="' + s.name + '">';
html += '<span class="oly-fp-sb-item-icon">' + I.chat + '</span>';
html += '<span class="oly-fp-sb-item-title">' + frappe.utils.escape_html(s.title || __("Untitled")) + '</span>';
html += '<span class="oly-fp-sb-item-acts">';
html += '<button class="oly-fp-sb-act" data-act="edit" data-name="' + s.name + '" title="' + __("Rename") + '">' + I.edit + '</button>';
html += '<button class="oly-fp-sb-act" data-act="delete" data-name="' + s.name + '" title="' + __("Delete") + '">' + I.trash + '</button>';
html += '</span>';
html += '</div>';
});
html += '</div>';
});
$list.html(html);

// Click session
$list.find(".oly-fp-sb-item").on("click", function (e) {
if ($(e.target).closest(".oly-fp-sb-act").length) return;
open_session($(this).data("name"));
});
// Edit
$list.find('[data-act="edit"]').on("click", function (e) {
e.stopPropagation();
rename_session($(this).data("name"));
});
// Delete
$list.find('[data-act="delete"]').on("click", function (e) {
e.stopPropagation();
delete_session($(this).data("name"));
});
}

function group_by_date(list) {
var now = frappe.datetime.now_date();
var groups = {};
list.forEach(function (s) {
var d = (s.modified || s.creation || "").substring(0, 10);
var label;
if (d === now) label = __("Today");
else if (d === frappe.datetime.add_days(now, -1)) label = __("Yesterday");
else label = frappe.datetime.str_to_user(d);
if (!groups[label]) groups[label] = { label: label, items: [] };
groups[label].items.push(s);
});
return Object.values(groups);
}

// ── Session Operations ──
function new_chat() {
current_session = null;
$title.text(__("New Chat"));
show_welcome();
$list.find(".oly-fp-sb-item").removeClass("active");
$input.val("").css("height", "auto").focus();
}

function open_session(name) {
current_session = name;
$list.find(".oly-fp-sb-item").removeClass("active");
$list.find('[data-name="' + name + '"]').first().addClass("active");
var s = sessions.find(function (x) { return x.name === name; });
$title.text(s ? s.title : __("Chat"));

frappe.xcall("oly_ai.api.chat.get_messages", { session_name: name }).then(function (msgs) {
$msgs.empty();
if (!msgs || !msgs.length) {
show_welcome();
return;
}
msgs.forEach(function (m) {
if (m.role === "user") append_user_msg(m.content);
else append_ai_msg(m.content, m);
});
scroll_bottom();
});
}

function rename_session(name) {
var s = sessions.find(function (x) { return x.name === name; });
var old_title = s ? s.title : "";
var d = new frappe.ui.Dialog({
title: __("Rename Conversation"),
fields: [{ fieldname: "title", fieldtype: "Data", label: __("Title"), reqd: 1, default: old_title }],
primary_action_label: __("Save"),
primary_action: function (v) {
frappe.xcall("oly_ai.api.chat.rename_session", { session_name: name, title: v.title })
.then(function () { d.hide(); load_sessions(); });
},
});
d.show();
}

function delete_session(name) {
frappe.confirm(__("Delete this conversation?"), function () {
frappe.xcall("oly_ai.api.chat.delete_session", { session_name: name }).then(function () {
if (current_session === name) new_chat();
load_sessions();
});
});
}

// ── Messages ──
function append_user_msg(text) {
$msgs.append(
'<div class="oly-m oly-m-user">' +
'<div class="oly-m-bubble">' + frappe.utils.escape_html(text) + '</div>' +
'<div class="oly-m-icon oly-m-icon-user">' + user_init + '</div></div>'
);
}

function append_ai_msg(content, meta) {
var parts = [r_model(meta), r_cost(meta)].filter(Boolean).join(" &middot; ");
$msgs.append(
'<div class="oly-m oly-m-ai">' +
'<div class="oly-m-icon oly-m-icon-ai">' + I.sparkles + '</div>' +
'<div class="oly-m-bubble">' +
'<div class="oly-m-content">' + oly_ai.render_markdown(content) + '</div>' +
'<div class="oly-m-foot">' +
'<button class="oly-copy-btn" data-text="' + frappe.utils.escape_html(content) + '">' + I.copy + ' ' + __("Copy") + '</button>' +
(parts ? '<span class="oly-m-meta">' + parts + '</span>' : '') +
'</div></div></div>'
);
wire_copy();
}

function r_model(m) { return m && m.model ? m.model : ""; }
function r_cost(m) { return m && m.cost ? "$" + Number(m.cost).toFixed(4) : ""; }

function wire_copy() {
$msgs.find(".oly-copy-btn").off("click").on("click", function () {
frappe.utils.copy_to_clipboard($(this).data("text"));
var $b = $(this);
$b.html(I.check + " " + __("Copied"));
setTimeout(function () { $b.html(I.copy + " " + __("Copy")); }, 2000);
});
}

function scroll_bottom() {
setTimeout(function () { var el = $msgs[0]; if (el) el.scrollTop = el.scrollHeight; }, 60);
}

// ── Send Message ──
function send_message() {
var q = $input.val().trim();
if (!q || sending) return;
sending = true;
$send.prop("disabled", true);
$input.val("").css("height", "auto");

var fire = function (sid) {
$msgs.find(".oly-welcome").remove();
append_user_msg(q);

var lid = "fp-ld-" + Date.now();
$msgs.append(
'<div class="oly-m oly-m-ai" id="' + lid + '">' +
'<div class="oly-m-icon oly-m-icon-ai">' + I.sparkles + '</div>' +
'<div class="oly-m-bubble"><div class="oly-typing"><span></span><span></span><span></span></div></div></div>'
);
scroll_bottom();

frappe.xcall("oly_ai.api.chat.send_message", { session_name: sid, message: q })
.then(function (r) {
$("#" + lid).remove();
append_ai_msg(r.content, r);
scroll_bottom();
sending = false;
$send.prop("disabled", false);
$input.focus();
// Refresh session list (title may auto-update)
load_sessions();
})
.catch(function (err) {
$("#" + lid).replaceWith(
'<div class="oly-m oly-m-ai">' +
'<div class="oly-m-icon oly-m-icon-err">!</div>' +
'<div class="oly-m-bubble oly-m-error">' + (err.message || __("Something went wrong")) + '</div></div>'
);
sending = false;
$send.prop("disabled", false);
});
};

if (!current_session) {
frappe.xcall("oly_ai.api.chat.create_session", { title: q.substring(0, 60) })
.then(function (s) {
current_session = s.name;
$title.text(s.title || __("New Chat"));
load_sessions();
fire(s.name);
});
} else {
fire(current_session);
}
}

// ── Events ──
$("#fp-new").on("click", new_chat);
$("#fp-toggle").on("click", function () {
sidebar_open = !sidebar_open;
$fp.toggleClass("fp-sidebar-closed", !sidebar_open);
});
$send.on("click", send_message);
$input.on("keydown", function (e) {
if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send_message(); }
});
$input.on("input", function () {
this.style.height = "auto";
this.style.height = Math.min(this.scrollHeight, 150) + "px";
$send.prop("disabled", !this.value.trim());
});
// Search
$("#fp-search").on("input", function () {
var q = $(this).val().toLowerCase();
if (!q) { render_sessions(sessions); return; }
var filtered = sessions.filter(function (s) { return (s.title || "").toLowerCase().indexOf(q) > -1; });
render_sessions(filtered);
});

// ── Init ──
show_welcome();
load_sessions();
$input.focus();
};
