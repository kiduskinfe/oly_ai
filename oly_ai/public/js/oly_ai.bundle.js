/* Oly AI — Global Bundle
 * Full-featured AI panel widget with:
 *   - Session history list with navigation
 *   - Model selector & mode tabs (Ask/Research/Agent/Execute)
 *   - Streaming support with fallback
 *   - Mobile responsive
 *   - Session persistence across page navigation
 *   - Keyboard shortcuts (Ctrl+/, Escape)
 */
frappe.provide("oly_ai");

// ─── Icons ───────────────────────────────────────────────────
const ICON = {
sparkles: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/></svg>',
sparkles_lg: '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/></svg>',
sparkles_avatar: '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/></svg>',
send: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z"/></svg>',
plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
close_icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
expand: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
copy: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
chat: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
edit: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
menu: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
back: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
stop: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="none"><rect x="6" y="6" width="12" height="12" rx="2" fill="white"/></svg>',
history: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
thumbs_up: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/></svg>',
thumbs_down: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10zM17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/></svg>',
mic: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',
speaker: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>',
brain: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a5 5 0 015 5c0 .8-.2 1.5-.5 2.2A5 5 0 0119 14a5 5 0 01-3 4.6V22h-2v-3.4A5 5 0 0111 14a5 5 0 01-2.5-4.3A5 5 0 017 7a5 5 0 015-5z"/><path d="M12 2v4"/><path d="M8 6.5C8 8 9.8 9 12 9s4-1 4-2.5"/></svg>',
};
oly_ai.ICON = ICON;

// ─── AI Avatar Helper ────────────────────────────────────────────────
function _ai_avatar_html() {
  return '<div class="oly-ai-msg-avatar oly-ai-msg-avatar-ai" style="width:26px;height:26px;min-width:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:var(--primary-color);color:white;">' + ICON.sparkles_avatar + '</div>';
}

// ─── Brand Colors (from AI Settings) ───────────────────────────────────
oly_ai.brand_gradient = function () {
  var b = (frappe.boot && frappe.boot.oly_ai_brand) || {};
  var from = b.color_from || '#f97316';
  var to = b.color_to || '#ea580c';
  return 'linear-gradient(135deg,' + from + ',' + to + ')';
};
oly_ai.brand_color = function () {
  var b = (frappe.boot && frappe.boot.oly_ai_brand) || {};
  return b.color_from || '#f97316';
};

// ─── Markdown Helper ─────────────────────────────────────────
oly_ai.render_markdown = function (md) {
  if (!md) return "";
  if (!oly_ai._md_configured) {
    frappe.markdown("init");
    if (frappe.md2html && frappe.md2html.setOption) {
      frappe.md2html.setOption("tables", true);
      frappe.md2html.setOption("tasklists", true);
      frappe.md2html.setOption("strikethrough", true);
      frappe.md2html.setOption("ghCodeBlocks", true);
      frappe.md2html.setOption("smoothLivePreview", true);
      frappe.md2html.setOption("openLinksInNewWindow", true);
      frappe.md2html.setOption("simpleLineBreaks", false);
      frappe.md2html.setOption("headerLevelStart", 2);
    }
    oly_ai._md_configured = true;
  }
  return '<div class="ai-md">' + frappe.md2html.makeHtml(md) + "</div>";
};

// ─── Meta Bar (for dialogs) ─────────────────────────────────
oly_ai._build_meta_bar = function (r, include_copy) {
  var parts = [];
  if (r.cached) parts.push('<span class="ai-meta-badge ai-meta-cached">Cached</span>');
  else if (r.model) parts.push('<span class="ai-meta-badge">' + r.model + "</span>");
  if (r.cost) parts.push('<span class="ai-meta-item">$' + r.cost.toFixed(4) + "</span>");
  if (r.response_time) parts.push('<span class="ai-meta-item">' + r.response_time + "s</span>");
  if (r.tokens) parts.push('<span class="ai-meta-item">' + r.tokens + " tok</span>");
  var copy = "";
  if (include_copy) {
    copy = '<button class="btn btn-xs btn-default ai-copy-btn" title="Copy">' + ICON.copy + " Copy</button>";
  }
  return '<div class="ai-meta-bar">' + parts.join('<span class="ai-meta-sep">&middot;</span>') + copy + "</div>";
};

// ─── AI Assist Dialog (for doctype forms) ────────────────────
oly_ai.show_assist_dialog = function (frm, feature, custom_prompt) {
  var d = new frappe.ui.Dialog({
    title: __("AI Assist — " + feature),
    size: "large",
    fields: [{
      fieldname: "ai_response_area", fieldtype: "HTML",
      options: '<div class="ai-loading"><div class="spinner-border text-primary" role="status"></div><p class="mt-3 text-muted">Analyzing document...</p></div>',
    }],
    primary_action_label: __("Copy to Clipboard"),
    primary_action: function () {
      frappe.utils.copy_to_clipboard(d._ai_content || "");
      frappe.show_alert({ message: __("Copied!"), indicator: "green" });
    },
    secondary_action_label: __("Add as Comment"),
    secondary_action: function () {
      var c = d._ai_content || "";
      if (!c) return;
      frappe.xcall("frappe.desk.form.utils.add_comment", {
        reference_doctype: frm.doctype, reference_name: frm.docname,
        content: "<p><strong>[AI " + feature + "]</strong></p>" + frappe.markdown(c),
        comment_email: frappe.session.user,
      }).then(function () { frappe.show_alert({ message: __("Added as comment"), indicator: "green" }); frm.reload_doc(); });
    },
  });
  d.show();
  frappe.xcall("oly_ai.api.gateway.ai_assist", {
    doctype: frm.doctype, name: frm.docname, feature: feature, custom_prompt: custom_prompt || null,
  }).then(function (r) {
    d._ai_content = r.content;
    d.fields_dict.ai_response_area.$wrapper.html(oly_ai._build_meta_bar(r, true) + '<div class="ai-response-box">' + oly_ai.render_markdown(r.content) + "</div>");
    d.$wrapper.find(".ai-copy-btn").on("click", function () {
      frappe.utils.copy_to_clipboard(d._ai_content || "");
      frappe.show_alert({ message: __("Copied!"), indicator: "green" });
    });
  }).catch(function (err) {
    d.fields_dict.ai_response_area.$wrapper.html('<div class="ai-error"><strong>AI Error</strong><br>' + (err.message || "Something went wrong.") + "</div>");
  });
};

// ─── Custom Prompt ───────────────────────────────────────────
oly_ai.show_custom_prompt = function (frm) {
  var d = new frappe.ui.Dialog({
    title: __("Ask AI about this document"),
    fields: [
      { fieldname: "prompt", fieldtype: "Small Text", label: __("Your question"), reqd: 1, placeholder: "e.g. Summarize key risks, Draft follow-up email..." },
      { fieldname: "feature", fieldtype: "Select", label: __("Type"), options: "Summarize\nTriage\nSuggest Reply\nDraft\nClassify\nCustom", default: "Custom" },
    ],
    primary_action_label: __("Ask AI"),
    primary_action: function (v) { d.hide(); oly_ai.show_assist_dialog(frm, v.feature, v.prompt); },
  });
  d.show();
};

// ─── Add AI Buttons ──────────────────────────────────────────
oly_ai.add_ai_buttons = function (frm, features) {
  if (!features) features = ["Summarize"];
  var group = __("AI Assist");
  features.forEach(function (f) { frm.add_custom_button(__(f), function () { oly_ai.show_assist_dialog(frm, f); }, group); });
  frm.add_custom_button(__("Ask AI..."), function () { oly_ai.show_custom_prompt(frm); }, group);
  // Replace the verbose "AI Assist" label with a compact icon + "AI"
  setTimeout(function () {
    var encoded = encodeURIComponent(group);
    var $grp = frm.page.inner_toolbar.find('.inner-group-button[data-label="' + encoded + '"]');
    if (!$grp.length) return;
    var $btn = $grp.find('button').first();
    if ($btn.length) {
      $btn.empty().append(
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="' + oly_ai.brand_color() + '" style="vertical-align:-2px;margin-right:3px;">' +
          '<path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"/>' +
        '</svg> AI ' + frappe.utils.icon("select", "xs")
      );
    }
  }, 300);
};

// ─── Global: Add AI buttons to ALL doctypes automatically ────
// Doctype-specific hooks can still override with custom features.
// This ensures every form gets at least "Summarize" + "Ask AI..."
oly_ai._ai_buttons_added = {};
$(document).on('form-refresh', function (e, frm) {
  if (!frm || !frm.doctype || !frm.docname) return;
  // Skip non-document forms, cancelled docs, and new unsaved docs
  if (frm.doc.docstatus === 2 || frm.is_new()) return;
  // Skip if a doctype-specific hook already added buttons
  var key = frm.doctype + ':' + frm.docname;
  if (oly_ai._ai_buttons_added[key]) return;
  // Check if AI buttons already exist (added by a doctype_js hook)
  var group = __("AI Assist");
  var encoded = encodeURIComponent(group);
  if (frm.page.inner_toolbar.find('.inner-group-button[data-label="' + encoded + '"]').length) {
    oly_ai._ai_buttons_added[key] = true;
    return;
  }
  // Add default AI buttons
  oly_ai.add_ai_buttons(frm, ["Summarize"]);
  oly_ai._ai_buttons_added[key] = true;
});
// Clear cache on route change so buttons re-render on next form
$(document).on('page-change', function () { oly_ai._ai_buttons_added = {}; });

// ═══════════════════════════════════════════════════════════════
// AI PANEL — Full-featured widget
// ═══════════════════════════════════════════════════════════════
oly_ai.Panel = class {
  constructor() {
    this.is_open = false;
    this.session = null;
    this.sessions = [];
    this.sending = false;
    this.current_model = 'gpt-4o-mini';
    this.current_mode = 'ask';
    this.available_models = [
      { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
      { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { value: 'gpt-4.1', label: 'GPT-4.1' },
      { value: 'gpt-4o', label: 'GPT-4o' },
      { value: 'gpt-5', label: 'GPT-5' },
      { value: 'gpt-5.2', label: 'GPT-5.2' },
      { value: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet' },
      { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
      { value: 'deepseek-chat', label: 'DeepSeek Chat' },
      { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { value: 'o4-mini', label: 'o4-mini' },
      { value: 'o3', label: 'o3' },
    ];
    this.view = 'chat'; // 'chat' | 'history'
    this._stream_task = null;
    this._stream_buffer = "";
    this._safety_timer = null;
    this._active_request_id = null;
    this._history_filter = 'mine'; // 'mine' | 'shared' | 'all'
    this.create_app();
    this._load_model_catalog();
    this._load_sessions(function () {
      // Restore last active session from localStorage on page reload
      var _saved = localStorage.getItem('oly_ai_session');
      if (_saved) {
        var found = me.sessions.find(function (s) { return s.name === _saved; });
        if (found) {
          me._open_session(_saved);
        } else {
          localStorage.removeItem('oly_ai_session');
        }
      }
    });
    this._load_user_access();
  }

  create_app() {
    var me = this;
    this.$app = $('<div class="oly-ai-app"></div>').css({
      position: 'fixed',
      bottom: '24px',
      right: '0px',
      display: 'flex',
      'flex-direction': 'column',
      'align-items': 'flex-end',
      'justify-content': 'flex-end',
      width: '100%',
      'max-width': '385px',
      'z-index': 1030,
      padding: '0 1rem'
    });
    $('body').append(this.$app);

    // Panel — hidden by default, ALL critical styles inline
    this.$panel = $('<div class="oly-ai-element"></div>').css({
      height: '582px',
      width: '100%',
      position: 'relative',
      'box-shadow': '0px 2px 6px rgba(17,43,66,0.08), 0px 1px 4px rgba(17,43,66,0.1)',
      background: 'var(--card-bg)',
      'border-radius': '6px',
      'margin-bottom': '1rem',
      border: '1px solid var(--dark-border-color)',
      overflow: 'hidden'
    });
    this.$panel.hide();
    this.$panel.append(
      '<span class="oly-ai-cross" style="display:none;position:absolute;top:12px;right:8px;cursor:pointer;color:var(--gray-700);z-index:5;">' +
      ICON.close_icon + '</span>'
    );

    // Container — flex column, full height
    this.$container = $('<div class="oly-ai-container"></div>').css({
      display: 'flex',
      'flex-direction': 'column',
      height: '100%',
      padding: '0',
      margin: '0',
      overflow: 'hidden'
    });

    // Header — Row 1: Branding + actions
    var model_opts = this.available_models.map(function (m) {
      return '<option value="' + m.value + '"' + (m.value === me.current_model ? ' selected' : '') + '>' + m.label + '</option>';
    }).join('');

    var mode_opts = [
      { value: 'ask', label: __('Ask') },
      { value: 'agent', label: __('Agent') },
      { value: 'execute', label: __('Execute') },
    ].map(function (m) {
      return '<option value="' + m.value + '"' + (m.value === me.current_mode ? ' selected' : '') + '>' + m.label + '</option>';
    }).join('');

    var _brand_hdr = ((frappe.boot && frappe.boot.oly_ai_brand) || {}).apply_to_header;
    var _hdr_bg = _brand_hdr ? 'background:' + oly_ai.brand_gradient() + ';' : '';
    var _hdr_icon_clr = _brand_hdr ? '#fff' : oly_ai.brand_color();
    var _hdr_title_clr = _brand_hdr ? '#fff' : 'var(--heading-color)';
    var _hdr_act_clr = _brand_hdr ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)';
    this.$container.append(
      '<div class="oly-ai-header-row1" style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px 6px;flex-shrink:0;' + _hdr_bg + '">' +
        '<div style="display:flex;align-items:center;gap:6px;">' +
          '<span style="display:flex;align-items:center;color:' + _hdr_icon_clr + ';">' + ICON.sparkles + '</span>' +
          '<span style="font-weight:600;font-size:14px;color:' + _hdr_title_clr + ';">' + __("AI Assistant") + '</span>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">' +
          '<a href="/app/ask-ai" class="oly-ai-hact" style="display:flex;align-items:center;padding:6px;border-radius:6px;color:' + _hdr_act_clr + ';text-decoration:none;" title="' + __("Full page") + '">' + ICON.expand + '</a>' +
          '<span class="oly-ai-hact" data-action="new" style="display:flex;align-items:center;padding:6px;border-radius:6px;color:' + _hdr_act_clr + ';cursor:pointer;" title="' + __("New chat") + '">' + ICON.plus + '</span>' +
        '</div>' +
      '</div>'
    );

    // Header — Row 2: History + title (left) | Mode picker (right)
    this.$container.append(
      '<div class="oly-ai-header-row2" style="display:flex;align-items:center;justify-content:space-between;padding:4px 12px 10px;border-bottom:1px solid var(--dark-border-color);flex-shrink:0;">' +
        '<div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1;">' +
          '<span class="oly-ai-hact oly-ai-history-btn" data-action="history" title="' + __("Chat history") + '" style="display:flex;align-items:center;padding:4px;border-radius:6px;color:var(--text-muted);cursor:pointer;flex-shrink:0;">' + ICON.menu + '</span>' +
          '<span class="oly-ai-header-title" style="font-weight:500;font-size:13px;color:var(--text-color);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + __("New Chat") + '</span>' +
        '</div>' +
        '<select class="oly-ai-mode-sel" id="panel-mode-sel" style="background:var(--control-bg);border:1px solid var(--border-color);border-radius:12px;color:var(--text-muted);font-size:0.6875rem;padding:3px 10px;outline:none;cursor:pointer;flex-shrink:0;">' + mode_opts + '</select>' +
      '</div>'
    );

    // Body (messages / welcome)
    this.$body = $('<div class="oly-ai-body"></div>').css({
      flex: '1',
      'overflow-y': 'auto',
      padding: '12px',
      'overflow-wrap': 'break-word'
    });
    this.$container.append(this.$body);

    // History view
    this.$history = $('<div class="oly-ai-history-view" style="flex:1;overflow-y:auto;padding:0;"></div>').hide();
    this.$container.append(this.$history);

    // Input area
    this.$container.append(
      '<div class="oly-ai-input-area" style="padding:8px 12px 10px;border-top:1px solid var(--dark-border-color);flex-shrink:0;">' +
        '<div id="panel-attach-preview" style="display:flex;flex-wrap:wrap;gap:6px;padding:0 0 6px;"></div>' +
        '<div style="position:relative;">' +
        '<div id="panel-mention-dropdown" style="position:absolute;bottom:100%;left:0;right:0;max-height:180px;overflow-y:auto;background:var(--card-bg);border:1px solid var(--dark-border-color);border-radius:10px;box-shadow:0 -4px 20px rgba(0,0,0,0.12);z-index:200;display:none;margin-bottom:6px;"></div>' +
        '<div class="oly-ai-input-row" style="display:flex;align-items:flex-end;gap:8px;">' +
          '<textarea class="oly-ai-input" rows="1" placeholder="' + __("Ask anything...") + '" maxlength="4000"' +
          ' style="flex:1;margin:0;border-radius:18px;font-size:0.875rem;border:1px solid var(--dark-border-color);background:var(--control-bg);color:var(--text-color);padding:8px 14px;resize:none;min-height:36px;max-height:120px;line-height:1.4;outline:none;font-family:inherit;overflow:hidden;"></textarea>' +
          '<span id="panel-mic-btn" style="cursor:pointer;height:2rem;width:2rem;min-width:2rem;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--text-muted);flex-shrink:0;transition:all 0.2s;" title="' + __("Voice input") + '">' + ICON.mic + '</span>' +
          '<span class="oly-ai-send-btn" id="panel-send-btn" style="cursor:pointer;height:2rem;width:2rem;min-width:2rem;border-radius:50%;background:var(--primary-color);display:flex;align-items:center;justify-content:center;position:relative;z-index:2;flex-shrink:0;">' + ICON.send + '</span>' +
        '</div>' +
        '</div>' +
        '<div class="oly-ai-input-footer" style="display:flex;align-items:center;justify-content:space-between;padding-top:6px;">' +
          '<div style="display:flex;align-items:center;gap:6px;">' +
            '<span id="panel-attach-btn" style="display:flex;align-items:center;cursor:pointer;color:var(--text-muted);padding:2px;flex-shrink:0;" title="' + __("Attach file") + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg></span>' +
            '<select class="oly-ai-model-sel" id="panel-model-sel" style="background:var(--control-bg);border:1px solid var(--border-color);border-radius:12px;color:var(--text-muted);font-size:0.6875rem;padding:3px 10px;outline:none;cursor:pointer;max-width:160px;">' + model_opts + '</select>' +
          '</div>' +
          '<span style="font-size:0.625rem;color:var(--text-muted);font-style:italic;">' + __("AI can make mistakes") + '</span>' +
        '</div>' +
      '</div>'
    );

    this.$panel.append(this.$container);
    this.$panel.appendTo(this.$app);

    this.$input = this.$panel.find('.oly-ai-input');
    this.$send = this.$panel.find('#panel-send-btn');
    this.$mic = this.$panel.find('#panel-mic-btn');
    this.$model = this.$panel.find('#panel-model-sel');
    this.$title = this.$panel.find('.oly-ai-header-title');
    this._attached_files = [];
    this._recording = false;
    this._media_recorder = null;
    this._audio_chunks = [];
    this._tts_audio = null;

    // Apply dark mode send button styling inline (CSS caching unreliable)
    if (document.documentElement.getAttribute('data-theme') === 'dark') {
      this.$send.css('background', 'white');
      this.$send.find('svg').css('fill', '#1a1a1a');
    }

    // Bubble
    this.is_desk = 'desk' in frappe;
    var bcls = this.is_desk ? ' d-none' : '';
    this.open_bubble_html = '<div class="oly-ai-bubble' + bcls + '"><span class="oly-ai-bubble-icon">' + ICON.sparkles_lg + '</span></div>';
    this.closed_bubble_html = '<div class="oly-ai-bubble oly-ai-bubble-closed' + bcls + '"><span>' + ICON.close_icon + '</span></div>';
    this.$bubble = $('<div id="oly-ai-bubble" title="' + __('AI Assistant') + '"></div>').html(this.open_bubble_html);
    this.$app.append(this.$bubble);

    // Navbar icon — always insert before the notifications bell for consistent order
    if (this.is_desk) {
      var $navbar_ul = $('header.navbar > .container > .navbar-collapse > ul.navbar-nav');
      var $notif = $navbar_ul.find('.dropdown-notifications').first();
      var _nav_brand = ((frappe.boot && frappe.boot.oly_ai_brand) || {}).apply_to_navbar;
      var _nav_clr = _nav_brand ? 'color:' + oly_ai.brand_color() + ';' : '';
      var $ai_li = $('<li class="nav-item dropdown dropdown-mobile oly-ai-nav" title="' + __('AI Assistant') + '">' +
        '<span class="btn-reset nav-link notifications-icon' + (_nav_brand ? '' : ' text-muted') + '" style="' + _nav_clr + '">' + ICON.sparkles + '</span></li>');
      $ai_li.on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        me.change_bubble();
      });
      if ($notif.length) {
        $ai_li.insertBefore($notif);
      } else {
        $navbar_ul.prepend($ai_li);
      }
    }

    this.show_welcome();
    this.setup_events();
    this._setup_streaming();

    // Context indicator (inserted after header row 2, before body)
    this._$context_bar = $('<div class="oly-ai-context-bar" style="display:none;padding:4px 12px 4px;flex-shrink:0;"></div>');
    this.$container.find('.oly-ai-header-row2').after(this._$context_bar);
    this._current_page_ctx = {};

    // Hide panel widget on the full-page /app/ask-ai to avoid overlap
    this._check_ask_ai_page();
    $(document).on('page-change.oly_ai', function () {
      me._check_ask_ai_page();
      // Delay context update — cur_frm/cur_list aren't set until after page renders
      setTimeout(function () {
        me._update_context_bar();
        // Refresh welcome chips with new page context if no active session
        if (!me.session && me.view === 'chat') {
          me.show_welcome();
        }
      }, 800);
    });
    // Initial context bar update
    setTimeout(function () { me._update_context_bar(); }, 1000);

    $(document).on('keydown.oly_ai_shortcut', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        me.change_bubble();
      }
      // Ctrl+K — open history & focus search
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K') && !e.shiftKey) {
        e.preventDefault();
        if (!me.is_open) me.change_bubble();
        me._load_sessions(function () {
          me._show_history_view();
          setTimeout(function () { me.$history.find('.oly-ai-hist-search').focus(); }, 100);
        });
      }
    });
  }

  // ── Full-page detection ──
  _check_ask_ai_page() {
    var on_ask_ai = (frappe.get_route_str() || '').indexOf('ask-ai') > -1;
    if (on_ask_ai) {
      this.$app.hide();
      if (this.is_open) this.change_bubble();
    } else {
      this.$app.show();
    }
  }

  // ── Context Bar — shows what page/document the AI is aware of ──
  _update_context_bar() {
    var ctx = oly_ai.get_page_context();
    this._current_page_ctx = ctx;
    var $bar = this._$context_bar;
    if (!$bar) return;

    if (ctx.doctype && ctx.docname) {
      var label = frappe.utils.escape_html(ctx.doctype) + ': ' + frappe.utils.escape_html(ctx.docname);
      $bar.html(
        '<div style="display:flex;align-items:center;gap:6px;padding:5px 10px;background:var(--control-bg);border-radius:8px;border:1px solid var(--border-color);">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="' + oly_ai.brand_color() + '" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>' +
          '<span style="font-size:0.6875rem;color:var(--text-color);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + label + '</span>' +
          '<span style="font-size:0.6rem;color:var(--text-muted);margin-left:auto;white-space:nowrap;">' + __('AI sees this') + '</span>' +
        '</div>'
      ).show();
    } else if (ctx.list_doctype) {
      $bar.html(
        '<div style="display:flex;align-items:center;gap:6px;padding:5px 10px;background:var(--control-bg);border-radius:8px;border:1px solid var(--border-color);">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="' + oly_ai.brand_color() + '" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>' +
          '<span style="font-size:0.6875rem;color:var(--text-color);font-weight:500;">' + __('Browsing') + ' ' + frappe.utils.escape_html(ctx.list_doctype) + ' ' + __('list') + '</span>' +
          '<span style="font-size:0.6rem;color:var(--text-muted);margin-left:auto;">' + __('AI aware') + '</span>' +
        '</div>'
      ).show();
    } else {
      $bar.hide();
    }
  }

  // ── View Switching ──
  _show_chat_view() {
    this.view = 'chat';
    this.$body.show();
    this.$history.hide();
    this.$panel.find('.oly-ai-input-area').show();
    this.$panel.find('.oly-ai-history-btn').html(ICON.menu).attr('data-action', 'history').attr('title', __('Chat history'));
    this.$input.focus();
  }

  _show_history_view() {
    this.view = 'history';
    this.$body.hide();
    this.$history.show();
    this.$panel.find('.oly-ai-input-area').hide();
    this.$panel.find('.oly-ai-history-btn').html(ICON.back).attr('data-action', 'back').attr('title', __('Back to chat'));
    this._render_history();
  }

  _render_history() {
    var me = this;
    var html = '<div class="oly-ai-hist-header" style="padding:12px;border-bottom:1px solid var(--border-color);">' +
      '<div style="position:relative;display:flex;align-items:center;">' +
        '<span style="position:absolute;left:10px;color:var(--text-muted);pointer-events:none;display:flex;align-items:center;">' + ICON.search + '</span>' +
        '<input type="text" class="oly-ai-hist-search" placeholder="' + __("Search chats...") + '"' +
        ' style="width:100%;padding:8px 12px 8px 32px;border:1px solid var(--border-color);border-radius:8px;background:var(--control-bg);color:var(--text-color);font-size:0.8125rem;outline:none;font-family:inherit;" />' +
      '</div>' +
      '<div style="display:flex;gap:2px;margin-top:8px;">' +
        '<button class="oly-ai-hist-filter' + (me._history_filter === 'mine' ? ' active' : '') + '" data-filter="mine" style="flex:1;text-align:center;padding:5px 0;font-size:0.7rem;font-weight:600;color:' + (me._history_filter === 'mine' ? 'var(--text-color)' : 'var(--text-muted)') + ';background:' + (me._history_filter === 'mine' ? 'var(--control-bg)' : 'transparent') + ';border:1px solid ' + (me._history_filter === 'mine' ? 'var(--dark-border-color)' : 'transparent') + ';border-radius:6px;cursor:pointer;font-family:inherit;">' + __("My Chats") + '</button>' +
        '<button class="oly-ai-hist-filter' + (me._history_filter === 'shared' ? ' active' : '') + '" data-filter="shared" style="flex:1;text-align:center;padding:5px 0;font-size:0.7rem;font-weight:600;color:' + (me._history_filter === 'shared' ? 'var(--text-color)' : 'var(--text-muted)') + ';background:' + (me._history_filter === 'shared' ? 'var(--control-bg)' : 'transparent') + ';border:1px solid ' + (me._history_filter === 'shared' ? 'var(--dark-border-color)' : 'transparent') + ';border-radius:6px;cursor:pointer;font-family:inherit;">' + __("Shared") + '</button>' +
        '<button class="oly-ai-hist-filter' + (me._history_filter === 'all' ? ' active' : '') + '" data-filter="all" style="flex:1;text-align:center;padding:5px 0;font-size:0.7rem;font-weight:600;color:' + (me._history_filter === 'all' ? 'var(--text-color)' : 'var(--text-muted)') + ';background:' + (me._history_filter === 'all' ? 'var(--control-bg)' : 'transparent') + ';border:1px solid ' + (me._history_filter === 'all' ? 'var(--dark-border-color)' : 'transparent') + ';border-radius:6px;cursor:pointer;font-family:inherit;">' + __("All") + '</button>' +
      '</div>' +
      '</div>';

    if (!this.sessions.length) {
      var emptyMsg = me._history_filter === 'shared' ? __("No shared conversations") : __("No conversations yet");
      html += '<div class="oly-ai-hist-empty" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 24px;color:var(--text-muted);">' +
        '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:12px;opacity:0.4;"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>' +
        '<span style="font-size:0.875rem;">' + emptyMsg + '</span>' +
      '</div>';
    } else {
      html += '<div class="oly-ai-hist-list" style="padding:8px;">';
      // Separate pinned items
      var pinned = this.sessions.filter(function (s) { return s.is_pinned; });
      var unpinned = this.sessions.filter(function (s) { return !s.is_pinned; });
      if (pinned.length) {
        html += '<div class="oly-ai-hist-group-label" style="padding:12px 8px 4px;font-size:0.6875rem;font-weight:600;color:var(--yellow-500,#eab308);text-transform:uppercase;letter-spacing:0.05em;display:flex;align-items:center;gap:4px;">' +
          '<svg width="10" height="10" viewBox="0 0 24 24" fill="var(--yellow-500,#eab308)" stroke="var(--yellow-500,#eab308)" stroke-width="2"><path d="M12 2l1.09 3.26L16 6l-2 2.5L14.5 12 12 10.5 9.5 12 10 8.5 8 6l2.91-.74L12 2z"/></svg>' +
          __("Pinned") + '</div>';
        pinned.forEach(function (s) { html += me._build_hist_item(s); });
      }
      var groups = this._group_sessions(unpinned);
      groups.forEach(function (g) {
        html += '<div class="oly-ai-hist-group-label" style="padding:12px 8px 4px;font-size:0.6875rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">' + g.label + '</div>';
        g.items.forEach(function (s) { html += me._build_hist_item(s); });
      });
      html += '</div>';
    }

    this.$history.html(html);

    // Tab filter clicks
    this.$history.find('.oly-ai-hist-filter').on('click', function () {
      var f = $(this).data('filter');
      if (f === me._history_filter) return;
      me._history_filter = f;
      me._load_sessions(function () { me._render_history(); });
    });

    this.$history.find('.oly-ai-hist-item').on('mouseenter', function () {
      $(this).css('background', 'var(--control-bg)');
      $(this).find('.oly-ai-hist-item-acts').css('opacity', '1');
    }).on('mouseleave', function () {
      var isActive = me.session === $(this).data('name');
      $(this).css('background', isActive ? 'var(--control-bg)' : 'transparent');
      $(this).find('.oly-ai-hist-item-acts').css('opacity', '0');
    });
    this.$history.find('.oly-ai-hist-act').on('mouseenter', function () {
      $(this).css('color', 'var(--red)');
    }).on('mouseleave', function () {
      $(this).css('color', 'var(--text-muted)');
    });

    this.$history.find('.oly-ai-hist-item').on('click', function (e) {
      if ($(e.target).closest('.oly-ai-hist-act').length) return;
      me._open_session($(this).data('name'));
      me._show_chat_view();
    });
    this.$history.find('[data-act="delete"]').on('click', function (e) {
      e.stopPropagation();
      me._delete_session($(this).data('name'));
    });
    this.$history.find('[data-act="share"]').on('click', function (e) {
      e.stopPropagation();
      me._show_share_dialog($(this).data('name'));
    });
    this.$history.find('[data-act="pin"]').on('click', function (e) {
      e.stopPropagation();
      var sn = $(this).data('name');
      frappe.xcall('oly_ai.api.chat.pin_session', { session_name: sn }).then(function (r) {
        frappe.show_alert({ message: r.is_pinned ? __("Pinned") : __("Unpinned"), indicator: "green" });
        me._load_sessions(function () { me._render_history(); });
      });
    });
    // Deep search: local filter + API search for messages
    var _hist_search_timer = null;
    this.$history.find('.oly-ai-hist-search').on('input', function () {
      var q = $(this).val().trim();
      clearTimeout(_hist_search_timer);
      me.$history.find('.oly-ai-hist-search-results').remove();
      if (!q) {
        me.$history.find('.oly-ai-hist-item').show();
        me.$history.find('.oly-ai-hist-group-label').show();
        return;
      }
      // Local title filter
      me.$history.find('.oly-ai-hist-item').each(function () {
        var t = $(this).find('.oly-ai-hist-item-title').text().toLowerCase();
        $(this).toggle(t.indexOf(q.toLowerCase()) > -1);
      });
      // Deep message search (debounced)
      if (q.length >= 3) {
        _hist_search_timer = setTimeout(function () {
          frappe.xcall('oly_ai.api.chat.search_messages', { query: q, limit: 10 }).then(function (results) {
            me.$history.find('.oly-ai-hist-search-results').remove();
            if (!results || !results.length) return;
            var rh = '<div class="oly-ai-hist-search-results" style="padding:4px 8px;">' +
              '<div style="font-size:0.6875rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;padding:8px 4px 4px;">' + __("Message matches") + '</div>';
            results.forEach(function (r) {
              var preview = frappe.utils.escape_html(r.content_preview || '');
              var re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
              preview = preview.replace(re, '<mark style="background:var(--yellow-highlight-color,#fff3cd);padding:0 1px;border-radius:2px;">$1</mark>');
              rh += '<div class="oly-ai-hist-search-hit" data-name="' + r.session_name + '" style="padding:6px 8px;border-radius:6px;cursor:pointer;margin-bottom:2px;border:1px solid var(--border-color);background:var(--control-bg);">' +
                '<div style="font-size:0.75rem;font-weight:600;color:var(--heading-color);margin-bottom:2px;">' + frappe.utils.escape_html(r.session_title || __("Untitled")) + '</div>' +
                '<div style="font-size:0.6rem;color:var(--text-muted);text-transform:uppercase;margin-bottom:1px;">' + frappe.utils.escape_html(r.role || '') + '</div>' +
                '<div style="font-size:0.7rem;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + preview + '</div>' +
              '</div>';
            });
            rh += '</div>';
            me.$history.find('.oly-ai-hist-list').after(rh);
            me.$history.find('.oly-ai-hist-search-hit').on('click', function () {
              me._open_session($(this).data('name'));
              me._show_chat_view();
            });
          });
        }, 400);
      }
    });
  }

  _show_share_dialog(session_name) {
    var me = this;
    var d = new frappe.ui.Dialog({
      title: __("Share Conversation"),
      fields: [
        {
          fieldname: "users",
          fieldtype: "MultiSelectPills",
          label: __("Share with"),
          get_data: function (txt) {
            return frappe.xcall("frappe.client.get_list", {
              doctype: "User",
              filters: { enabled: 1, name: ["!=", frappe.session.user], full_name: ["like", "%" + (txt || "") + "%"] },
              fields: ["name as value", "full_name as description"],
              limit_page_length: 10,
            });
          },
          reqd: 1,
        },
        { fieldtype: "Section Break" },
        { fieldname: "shared_list_html", fieldtype: "HTML", label: __("Currently shared with") },
      ],
      primary_action_label: __("Share"),
      primary_action: function (v) {
        if (!v.users || !v.users.length) return;
        frappe.xcall("oly_ai.api.chat.share_session", {
          session_name: session_name,
          users: JSON.stringify(v.users),
        }).then(function (r) {
          if (r && r.added && r.added.length) {
            frappe.show_alert({ message: __("Shared with {0} user(s)", [r.added.length]), indicator: "green" });
          } else {
            frappe.show_alert({ message: __("Already shared"), indicator: "blue" });
          }
          d.hide();
        });
      },
    });

    frappe.xcall("oly_ai.api.chat.get_shared_users", { session_name: session_name }).then(function (rows) {
      if (!rows || !rows.length) {
        d.fields_dict.shared_list_html.$wrapper.html(
          '<p style="color:var(--text-muted);font-size:0.8rem;">' + __("Not shared with anyone yet") + '</p>'
        );
      } else {
        var html = '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
        rows.forEach(function (r) {
          html += '<span style="display:inline-flex;align-items:center;gap:4px;background:var(--control-bg);border:1px solid var(--border-color);border-radius:16px;padding:4px 10px;font-size:0.8rem;">' +
            '<span>' + frappe.utils.escape_html(r.full_name || r.user) + '</span>' +
            '<span class="panel-unshare-btn" data-user="' + r.user + '" style="cursor:pointer;color:var(--text-muted);font-weight:700;margin-left:2px;">&times;</span>' +
          '</span>';
        });
        html += '</div>';
        d.fields_dict.shared_list_html.$wrapper.html(html);
        d.fields_dict.shared_list_html.$wrapper.find('.panel-unshare-btn').on('click', function () {
          var u = $(this).data('user');
          frappe.xcall("oly_ai.api.chat.unshare_session", {
            session_name: session_name,
            unshare_user: u,
          }).then(function () {
            frappe.show_alert({ message: __("Removed"), indicator: "orange" });
            d.hide();
            me._show_share_dialog(session_name);
          });
        });
      }
    });

    d.show();
  }

  _group_sessions(list) {
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

  _build_hist_item(s) {
    var me = this;
    var activeBg = me.session === s.name ? 'background:var(--control-bg);' : '';
    var is_mine = s.is_owner !== false;
    var pin_fill = s.is_pinned ? 'var(--yellow-500,#eab308)' : 'none';
    var pin_stroke = s.is_pinned ? 'var(--yellow-500,#eab308)' : 'var(--text-muted)';
    var html = '<div class="oly-ai-hist-item" data-name="' + s.name + '" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;' + activeBg + '">' +
      '<span class="oly-ai-hist-item-title" style="flex:1;font-size:0.8125rem;color:var(--text-color);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:flex;align-items:center;gap:4px;">' + frappe.utils.escape_html(s.title || __("Untitled"));
    if (is_mine && s.shared_count) {
      html += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" style="flex-shrink:0;opacity:0.7;"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';
    }
    if (!is_mine && s.owner_name) {
      html += '<span style="font-size:0.6rem;color:var(--text-muted);background:var(--control-bg);border-radius:4px;padding:1px 5px;margin-left:4px;">' + frappe.utils.escape_html(s.owner_name) + '</span>';
    }
    html += '</span>' +
      '<span class="oly-ai-hist-item-acts" style="display:flex;align-items:center;opacity:0;transition:opacity 0.15s;">' +
      '<button class="oly-ai-hist-act" data-act="pin" data-name="' + s.name + '" title="' + (s.is_pinned ? __("Unpin") : __("Pin")) + '"' +
        ' style="background:none;border:none;padding:4px;border-radius:4px;color:var(--text-muted);cursor:pointer;display:flex;align-items:center;">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="' + pin_fill + '" stroke="' + pin_stroke + '" stroke-width="2"><path d="M12 2l1.09 3.26L16 6l-2 2.5L14.5 12 12 10.5 9.5 12 10 8.5 8 6l2.91-.74L12 2z"/></svg></button>';
    if (is_mine) {
      html += '<button class="oly-ai-hist-act" data-act="share" data-name="' + s.name + '" title="' + __("Share") + '"' +
        ' style="background:none;border:none;padding:4px;border-radius:4px;color:var(--text-muted);cursor:pointer;display:flex;align-items:center;">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>';
      html += '<button class="oly-ai-hist-act" data-act="delete" data-name="' + s.name + '" title="' + __("Delete") + '"' +
        ' style="background:none;border:none;padding:4px;border-radius:4px;color:var(--text-muted);cursor:pointer;display:flex;align-items:center;">' + ICON.trash + '</button>';
    }
    html += '</span></div>';
    return html;
  }

  // ── Show/Hide ──
  show_chat_widget() {
    this.is_open = true;
    this.$panel.fadeIn(250);
    // Defensive: if body is empty and no active session, re-render welcome
    if (!this.session && this.view === 'chat' && !this.$body.children().length) {
      this.show_welcome();
    }
    // Refresh context bar each time panel opens
    this._update_context_bar();
    if (this.view === 'chat') this.$input.focus();
  }

  hide_chat_widget() {
    this.is_open = false;
    this.$panel.fadeOut(300);
  }

  change_bubble() {
    this.is_open = !this.is_open;
    if (!this.is_open) {
      this.$bubble.attr('title', __('AI Assistant')).html(this.open_bubble_html);
      this.hide_chat_widget();
    } else {
      this.$bubble.attr('title', __('Close')).html(this.closed_bubble_html);
      this.show_chat_widget();
    }
  }

  should_close(e) {
    var app = $('.oly-ai-app'), navbar = $('.navbar'), modal = $('.modal');
    return !app.is(e.target) && app.has(e.target).length === 0 &&
      !navbar.is(e.target) && navbar.has(e.target).length === 0 &&
      !modal.is(e.target) && modal.has(e.target).length === 0;
  }

  // ── Events ──
  setup_events() {
    var me = this;
    $(document).on('click', '.oly-ai-nav', function () { me.change_bubble(); });
    $(document).on('click', '#oly-ai-bubble', function () { me.change_bubble(); });
    this.$panel.find('.oly-ai-cross').on('click', function () { me.change_bubble(); });
    $(document).mouseup(function (e) { if (me.should_close(e) && me.is_open) me.change_bubble(); });

    // Header
    this.$panel.on('click', '.oly-ai-history-btn', function () {
      var action = $(this).attr('data-action');
      if (action === 'history') me._load_sessions(function () { me._show_history_view(); });
      else me._show_chat_view();
    });
    this.$panel.find('[data-action="new"]').on('click', function () { me.new_chat(); });
    this.$panel.find('[data-action="export"]').on('click', function () { me._export_chat(); });

    // Mode selector (dropdown)
    this.$panel.find('#panel-mode-sel').on('change', function () {
      me.current_mode = $(this).val();
      var ph = { ask: __("Ask anything..."), agent: __("Describe what you need..."), execute: __("What action to execute?") };
      me.$input.attr('placeholder', ph[me.current_mode] || ph.ask);
      var rec = { ask: 'gpt-4o-mini', agent: 'gpt-5.2', execute: 'gpt-4o-mini' };
      if (rec[me.current_mode] && me.$model.find('option[value="' + rec[me.current_mode] + '"]').length) {
        me.$model.val(rec[me.current_mode]);
        me.current_model = rec[me.current_mode];
      }
    });

    this.$model.on('change', function () { me.current_model = $(this).val(); });
    this.$panel.on('click', '.oly-ai-fb-btn', function () {
      var $btn = $(this), fb = $btn.data('fb');
      $btn.css('color', fb === 'up' ? 'var(--green)' : 'var(--red)');
      $btn.siblings('.oly-ai-fb-btn').css('color', 'var(--text-muted)');
    });
    // TTS speaker button (event delegation)
    this.$panel.on('click', '.oly-ai-tts-btn', function () {
      var txt = $(this).closest('.oly-ai-msg-footer').siblings().not('.oly-ai-msg-footer').text();
      if (!txt) txt = $(this).closest('.oly-ai-msg-content').find('.markdown-content, .oly-ai-msg-content > *:not(.oly-ai-msg-footer)').text();
      me._play_tts($(this), txt);
    });
    this.$panel.on('click', '#panel-send-btn', function () { me.send(); });
    this.$panel.on('click', '#panel-mic-btn', function () {
      if (me._recording) me._stop_recording(); else me._start_recording();
    });
    this.$input.on('keydown', function (e) {
      // If mention dropdown is open, handle navigation
      var $dd = me.$panel.find('#panel-mention-dropdown');
      if ($dd.is(':visible')) {
        if (e.which === 40) { // ArrowDown
          e.preventDefault();
          var $items = $dd.find('.oly-mention-item');
          var $cur = $items.filter('.active');
          var idx = $items.index($cur);
          $cur.removeClass('active');
          $items.eq(Math.min(idx + 1, $items.length - 1)).addClass('active');
          return;
        } else if (e.which === 38) { // ArrowUp
          e.preventDefault();
          var $items = $dd.find('.oly-mention-item');
          var $cur = $items.filter('.active');
          var idx = $items.index($cur);
          $cur.removeClass('active');
          $items.eq(Math.max(idx - 1, 0)).addClass('active');
          return;
        } else if (e.which === 13 || e.which === 9) { // Enter or Tab
          var $sel = $dd.find('.oly-mention-item.active');
          if ($sel.length) {
            e.preventDefault();
            if (me._mention_mode === 'document' && $sel.data('docname')) {
              me._insert_doc_mention($sel.data('docname'));
            } else if ($sel.data('doctype')) {
              me._insert_mention($sel.data('doctype'));
            }
            return;
          }
        } else if (e.which === 32 && me._mention_mode === 'document') { // Space => schema only
          $dd.hide().empty();
          me._mention_mode = 'doctype';
          me._mention_doctype = null;
          var el = me.$input[0];
          var val = el.value;
          var pos = el.selectionStart;
          var before = val.substring(0, pos);
          var after = val.substring(pos);
          var new_before = before.replace(/@([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,4}):[^\s]*$/, '@$1 ');
          el.value = new_before + after;
          el.setSelectionRange(new_before.length, new_before.length);
          e.preventDefault();
          return;
        } else if (e.which === 27) { // Escape
          $dd.hide().empty();
          return;
        }
      }
      if (e.which === 13 && !e.shiftKey) { e.preventDefault(); me.send(); }
    });
    this._mention_timer = null;
    this._mention_mode = 'doctype';
    this._mention_doctype = null;
    this.$input.on('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
      // @mention detection
      clearTimeout(me._mention_timer);
      var val = this.value;
      var pos = this.selectionStart;
      var before = val.substring(0, pos);

      // Check for @DocType: pattern (document-level search)
      var doc_match = before.match(/@([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,4}):([^\s]*)$/);
      if (doc_match) {
        me._mention_mode = 'document';
        me._mention_doctype = doc_match[1].trim();
        me._mention_timer = setTimeout(function () { me._search_documents(me._mention_doctype, doc_match[2] || ''); }, 200);
        return;
      }

      var match = before.match(/@([A-Za-z\s]{1,40})$/);
      if (match) {
        var q = match[1].trim();
        me._mention_mode = 'doctype';
        me._mention_doctype = null;
        if (q.length >= 1) {
          me._mention_timer = setTimeout(function () { me._search_doctypes(q); }, 200);
        }
      } else {
        me._mention_mode = 'doctype';
        me._mention_doctype = null;
        me.$panel.find('#panel-mention-dropdown').hide().empty();
      }
    });

    // File attachment — use Frappe Upload dialog for full options
    this.$panel.find('#panel-attach-btn').on('click', function () {
      new frappe.ui.FileUploader({
        folder: 'Home/Attachments',
        on_success: function (file_doc) {
          me._attached_files.push({
            name: file_doc.file_name || file_doc.name,
            file_url: file_doc.file_url,
            is_image: /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(file_doc.file_name || file_doc.name),
          });
          me._render_attach_preview();
        },
      });
    });

    $(document).on('keydown.oly_ai', function (e) {
      if (e.key === 'Escape' && me.is_open) {
        if (me.view === 'history') me._show_chat_view();
        else me.change_bubble();
      }
    });

    // ── Paste support (Ctrl+V / Cmd+V images & files) ──
    this.$input.on('paste', function (e) {
      var cd = e.originalEvent.clipboardData;
      if (!cd || !cd.items) return;
      var paste_files = [];
      for (var i = 0; i < cd.items.length; i++) {
        if (cd.items[i].kind === 'file') {
          var f = cd.items[i].getAsFile();
          if (f) paste_files.push(f);
        }
      }
      if (paste_files.length) {
        e.preventDefault();
        me._handle_dropped_files(paste_files);
      }
    });

    // ── Drag & Drop support ──
    var drag_counter = 0;
    this.$panel.on('dragenter', function (e) {
      e.preventDefault(); e.stopPropagation();
      drag_counter++;
      if (drag_counter === 1) {
        if (!me.$panel.find('.oly-ai-drop-overlay').length) {
          me.$panel.append('<div class="oly-ai-drop-overlay" style="position:absolute;inset:0;background:rgba(var(--primary-color-rgb,59,130,246),0.08);border:2px dashed var(--primary-color);border-radius:12px;z-index:50;display:flex;align-items:center;justify-content:center;pointer-events:none;"><span style="background:var(--card-bg);padding:10px 20px;border-radius:10px;font-size:0.85rem;font-weight:600;color:var(--primary-color);box-shadow:0 4px 12px rgba(0,0,0,0.1);">' + __("Drop files here") + '</span></div>');
        }
      }
    });
    this.$panel.on('dragover', function (e) { e.preventDefault(); e.stopPropagation(); });
    this.$panel.on('dragleave', function (e) {
      e.preventDefault(); e.stopPropagation();
      drag_counter--;
      if (drag_counter <= 0) { drag_counter = 0; me.$panel.find('.oly-ai-drop-overlay').remove(); }
    });
    this.$panel.on('drop', function (e) {
      e.preventDefault(); e.stopPropagation();
      drag_counter = 0;
      me.$panel.find('.oly-ai-drop-overlay').remove();
      var dt = e.originalEvent.dataTransfer;
      if (dt && dt.files && dt.files.length) me._handle_dropped_files(dt.files);
    });
  }

  // ── Data Loading ──
  _load_sessions(cb) {
    var me = this;
    frappe.call({
      method: "oly_ai.api.chat.get_sessions",
      args: { filter_type: me._history_filter },
      callback: function (r) { me.sessions = (r && r.message) || []; if (cb) cb(); },
      error: function () { if (cb) cb(); },
    });
  }

  _load_model_catalog() {
    var me = this;
    frappe.call({
      method: "oly_ai.api.chat.get_model_catalog",
      callback: function (r) {
        var res = r && r.message;
        if (!res || !res.models) return;
        me.available_models = res.models;
        if (res.default_model) me.current_model = res.default_model;
        var opts = res.models.map(function (m) {
          return '<option value="' + m.value + '"' + (m.value === me.current_model ? ' selected' : '') + '>' + (m.label || m.value) + '</option>';
        }).join('');
        me.$model.html(opts).val(me.current_model);
      },
    });
  }

  _load_user_access() {
    var me = this;
    frappe.xcall('oly_ai.core.access_control.get_user_access').then(function (access) {
      if (access && access.allowed_modes) {
        me.$panel.find('.oly-ai-mode-btn').each(function () {
          if (access.allowed_modes.indexOf($(this).data('mode')) === -1) $(this).hide();
        });
      }
    }).catch(function () {});
  }

  // ── File Attachment ──
  _handle_files(file_list) {
    var me = this;
    if (!file_list || !file_list.length) return;
    for (var i = 0; i < file_list.length; i++) {
      (function (f) {
        var fd = new FormData();
        fd.append('file', f);
        fd.append('is_private', 1);
        fd.append('folder', 'Home/Attachments');
        $.ajax({
          url: '/api/method/upload_file',
          type: 'POST',
          data: fd,
          processData: false,
          contentType: false,
          headers: { 'X-Frappe-CSRF-Token': frappe.csrf_token },
          success: function (r) {
            var msg = r.message || {};
            me._attached_files.push({
              name: msg.file_name || f.name,
              file_url: msg.file_url,
              is_image: /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(msg.file_name || f.name),
            });
            me._render_attach_preview();
          },
          error: function () {
            frappe.show_alert({ message: __('Failed to upload ') + f.name, indicator: 'red' });
          },
        });
      })(file_list[i]);
    }
  }

  _handle_dropped_files(file_list) {
    var me = this;
    var accepted = /\.(jpg|jpeg|png|gif|webp|bmp|svg|pdf|txt|csv|xlsx|xls|doc|docx|json|xml|md|pptx|ppt)$/i;
    var max_size = 20 * 1024 * 1024;
    var valid = [];
    for (var i = 0; i < file_list.length; i++) {
      var f = file_list[i];
      if ((f.type && f.type.startsWith('image/')) || accepted.test(f.name)) {
        if (f.size > max_size) {
          frappe.show_alert({ message: __('File too large (max 20MB): {0}', [f.name]), indicator: 'orange' });
        } else {
          valid.push(f);
        }
      } else {
        frappe.show_alert({ message: __('Unsupported file type: {0}', [f.name]), indicator: 'orange' });
      }
    }
    if (valid.length) this._handle_files(valid);
  }

  _render_attach_preview() {
    var me = this;
    var $p = this.$panel.find('#panel-attach-preview');
    if (!this._attached_files.length) { $p.empty(); return; }
    var html = this._attached_files.map(function (f, i) {
      var thumb = f.is_image ? '<img src="' + f.file_url + '" style="width:20px;height:20px;border-radius:3px;object-fit:cover;" /> ' : '';
      return '<span style="display:inline-flex;align-items:center;gap:4px;background:var(--control-bg);border:1px solid var(--border-color);border-radius:6px;padding:3px 8px;font-size:0.7rem;color:var(--text-muted);">' +
        thumb + frappe.utils.escape_html(f.name) +
        '<span class="panel-attach-rm" data-idx="' + i + '" style="cursor:pointer;font-weight:700;margin-left:2px;color:var(--text-muted);">&times;</span>' +
      '</span>';
    }).join('');
    $p.html(html);
    $p.find('.panel-attach-rm').on('click', function () {
      me._attached_files.splice($(this).data('idx'), 1);
      me._render_attach_preview();
    });
  }

  // ── Welcome ──
  show_welcome() {
    try { this._render_welcome(); } catch (e) { console.warn('oly_ai: show_welcome error', e); }
  }

  _render_welcome() {
    // Smart chips — adapt to current page context
    var ctx = oly_ai.get_page_context();
    var chips;
    if (ctx.doctype && ctx.docname) {
      var dt = ctx.doctype;
      var dn = ctx.docname;
      chips = [
        __('Summarize this {0}', [dt]),
        __('What actions should I take on this?'),
        __('Show me related documents'),
        __('Any issues or risks here?'),
      ];
    } else if (ctx.list_doctype) {
      var ldt = ctx.list_doctype;
      chips = [
        __('How do I create a new {0}?', [ldt]),
        __('What fields does {0} have?', [ldt]),
        __('Show me the workflow for {0}', [ldt]),
        __('What reports are available?'),
      ];
    } else {
      chips = [
        __("How do I create a Sales Order?"),
        __("What is our leave policy?"),
        __("Explain the purchase workflow"),
        __("How to submit a timesheet?"),
      ];
    }
    this.$body.html(
      '<div class="oly-ai-welcome" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:24px 16px;text-align:center;">' +
        '<div style="width:52px;height:52px;border-radius:50%;background:' + oly_ai.brand_gradient() + ';display:flex;align-items:center;justify-content:center;margin-bottom:16px;color:white;">' +
          ICON.sparkles_lg +
        '</div>' +
        '<h3 style="margin:0 0 4px;font-size:1.125rem;font-weight:600;color:var(--heading-color);">' + __("How can I help?") + '</h3>' +
        '<p style="margin:0 0 20px;font-size:0.8125rem;color:var(--text-muted);">' + __("Ask me anything about your workspace") + '</p>' +
        '<div class="oly-ai-chips" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;max-width:320px;">' +
          chips.map(function (c) {
            return '<div class="oly-ai-chip" style="padding:10px 12px;border:1px solid var(--border-color);border-radius:10px;font-size:0.8rem;color:var(--text-color);cursor:pointer;text-align:left;line-height:1.3;">' + c + '</div>';
          }).join('') +
        '</div>' +
      '</div>'
    );
    var me = this;
    this.$body.find('.oly-ai-chip').on('mouseenter', function () {
      $(this).css({ 'border-color': 'var(--primary-color)', background: 'var(--control-bg)' });
    }).on('mouseleave', function () {
      $(this).css({ 'border-color': 'var(--border-color)', background: 'transparent' });
    }).on('click', function () {
      me.$input.val($(this).text().trim());
      me.send();
    });
  }

  // ── Session Management ──
  new_chat() {
    this.session = null;
    localStorage.removeItem('oly_ai_session');
    if (this.sending) this._stop_generation();
    this.$title.text(__("New Chat"));
    this.show_welcome();
    this.$input.val('').css('height', 'auto').focus();
    if (this.view === 'history') this._show_chat_view();
  }

  _open_session(name) {
    var me = this;
    this.session = name;
    localStorage.setItem('oly_ai_session', name);
    if (this.sending) this._stop_generation();
    var s = this.sessions.find(function (x) { return x.name === name; });
    this.$title.text(s ? s.title : __("Chat"));
    this.$body.html('<div style="display:flex;align-items:center;justify-content:center;height:100%;"><div class="oly-ai-typing"><span></span><span></span><span></span></div></div>');

    frappe.call({
      method: "oly_ai.api.chat.get_messages",
      args: { session_name: name },
      callback: function (r) {
        if (me.session !== name) return;
        try {
          var msgs = (r && r.message) || [];
          me.$body.empty();
          if (!msgs.length) { me.show_welcome(); return; }
          msgs.forEach(function (m) {
            if (m.role === 'user') me._user_msg(m.content || '', m.idx);
            else me._ai_msg_full(m.content || '', m);
          });
          me._scroll();
          // Auto-switch model to match session's last used model
          var last_model = null;
          for (var mi = msgs.length - 1; mi >= 0; mi--) {
            if (msgs[mi].model) { last_model = msgs[mi].model; break; }
          }
          if (last_model && me.$model.find('option[value="' + last_model + '"]').length) {
            me.$model.val(last_model);
            me.current_model = last_model;
          }
        } catch (err) {
          me.$body.html('<div class="oly-ai-msg-error" style="margin:20px;cursor:pointer;">' + __("Error loading. Click to retry.") + '</div>');
          me.$body.one('click', function () { me._open_session(name); });
        }
      },
      error: function () {
        me.$body.html('<div class="oly-ai-msg-error" style="margin:20px;cursor:pointer;">' + __("Failed to load. Click to retry.") + '</div>');
        me.$body.one('click', function () { me._open_session(name); });
      },
    });
  }

  _delete_session(name) {
    var me = this;
    frappe.confirm(__("Delete this conversation?"), function () {
      frappe.xcall('oly_ai.api.chat.delete_session', { session_name: name }).then(function () {
        if (me.session === name) me.new_chat();
        me._load_sessions(function () { me._render_history(); });
      });
    });
  }

  _export_chat() {
    if (!this.session) { frappe.show_alert({ message: __("No active chat"), indicator: "yellow" }); return; }
    var s = this.sessions.find(function (x) { return x.name === this.session; }.bind(this));
    var title = (s && s.title) || __("Chat");
    var lines = ["# " + title, ""];
    this.$body.find('.oly-ai-user-msg, .oly-ai-md-wrap').each(function () {
      var $el = $(this);
      if ($el.hasClass('oly-ai-user-msg')) {
        lines.push("## User\n");
        lines.push($el.text().trim());
        lines.push("");
      } else {
        lines.push("## Assistant\n");
        lines.push($el.text().trim());
        lines.push("");
      }
    });
    var md = lines.join("\n");
    var blob = new Blob([md], { type: "text/markdown" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = title.replace(/[^a-zA-Z0-9 _-]/g, "").substring(0, 60) + ".md";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    frappe.show_alert({ message: __("Chat exported"), indicator: "green" });
  }

  // ── Sending State ──
  _set_sending(is_sending) {
    this.sending = is_sending;
    if (this._safety_timer) { clearTimeout(this._safety_timer); this._safety_timer = null; }
    var me = this;
    var $btn = this.$panel.find('#panel-send-btn');
    if (is_sending) {
      $btn.addClass('oly-ai-stop-btn').removeClass('oly-ai-send-btn').html(ICON.stop)
        .css({ background: 'var(--primary-color)', 'border-radius': '50%' });
      $btn.off('click').on('click', function () { me._stop_generation(); });
      this.$input.attr('placeholder', __("Type your next message..."));
      this._safety_timer = setTimeout(function () { if (me.sending) me._set_sending(false); }, 120000);
    } else {
      $btn.addClass('oly-ai-send-btn').removeClass('oly-ai-stop-btn').html(ICON.send)
        .css({ background: 'var(--primary-color)', 'border-radius': '50%' });
      $btn.off('click').on('click', function () { me.send(); });
      var ph = { ask: __("Ask anything..."), research: __("Research in depth..."), agent: __("Describe what you need..."), execute: __("What action to execute?") };
      this.$input.attr('placeholder', ph[this.current_mode] || ph.ask);
    }
  }

  _stop_generation() {
    this._active_request_id = null;
    this.$body.find('.oly-ai-typing').closest('.oly-ai-msg').remove();
    if (this._stream_task) {
      var $el = $('#panel-stream-' + this._stream_task);
      if ($el.length) {
        $el.removeClass('ai-streaming-cursor');
        var partial = this._stream_buffer || '';
        if (partial) $el.html(oly_ai.render_markdown(partial) + '<div class="oly-ai-msg-meta" style="margin-top:4px;">⏹ ' + __("Stopped") + '</div>');
      }
      this._stream_task = null;
      this._stream_buffer = '';
    }
    this._set_sending(false);
  }

  // ── Send ──
  send(retry_text) {
    var q = retry_text || this.$input.val().trim();
    if (!q || this.sending) return;
    this._last_message = q;
    this._set_sending(true);
    if (!retry_text) this.$input.val('').css('height', 'auto');

    var me = this;
    var sel_model = this.current_model;
    var request_id = 'req-' + Date.now();
    this._active_request_id = request_id;
    var files = this._attached_files.slice();
    this._attached_files = [];
    this._render_attach_preview();

    var fire = function (sid) {
      me.$body.find('.oly-ai-welcome').remove();
      me._user_msg(q);

      var lid = 'oly-t-' + Date.now();
      me.$body.append(
        '<div class="oly-ai-msg oly-ai-msg-ai" id="' + lid + '" style="display:flex;gap:8px;margin-bottom:12px;align-items:flex-start;">' +
        _ai_avatar_html() +
        '<div class="oly-ai-msg-content" style="flex:1;min-width:0;background:var(--control-bg);border-radius:4px 18px 18px 18px;padding:10px 14px;font-size:0.8125rem;line-height:1.6;"><div class="oly-ai-typing"><span></span><span></span><span></span></div></div></div>'
      );
      me._scroll();

      // Gather page context for AI awareness
      var page_ctx = oly_ai.get_page_context();
      var trail = oly_ai._page_trail || [];

      // Try streaming first
      frappe.xcall('oly_ai.api.stream.send_message_stream', {
        session_name: sid, message: q, model: sel_model, mode: me.current_mode,
        page_doctype: page_ctx.doctype || null,
        page_docname: page_ctx.docname || null,
        list_doctype: page_ctx.list_doctype || null,
        page_trail: trail.length ? JSON.stringify(trail) : null
      }).then(function (r) {
        me._stream_task = r.task_id;
        me._stream_buffer = '';
        $('#' + lid + ' .oly-ai-msg-content').html('<span id="panel-stream-' + r.task_id + '" class="ai-streaming-cursor"></span>');
        me._scroll();
      }).catch(function () {
        // Sync fallback
        frappe.call({
          method: 'oly_ai.api.chat.send_message',
          args: { session_name: sid, message: q, model: sel_model, mode: me.current_mode,
            page_doctype: page_ctx.doctype || null,
            page_docname: page_ctx.docname || null,
            list_doctype: page_ctx.list_doctype || null,
            page_trail: trail.length ? JSON.stringify(trail) : null },
          callback: function (r) {
            if (me._active_request_id !== request_id) return;
            try {
              var data = r && r.message;
              $('#' + lid).replaceWith(me._build_ai_msg(data));
              me._wire_copy();
              if (data && data.pending_actions && data.pending_actions.length) me._render_action_cards(data.pending_actions);
              me._scroll();
              me._set_sending(false);
              me._load_sessions();
              me.$title.text((data && data.session_title) || q.substring(0, 40));
            } catch (err) {
              $('#' + lid + ' .oly-ai-msg-content').html('<div class="oly-ai-msg-error">' + frappe.utils.escape_html(String(err)) + '</div>');
              me._set_sending(false);
            }
          },
          error: function (r) {
            if (me._active_request_id !== request_id) return;
            $('#' + lid + ' .oly-ai-msg-content').html('<div class="oly-ai-msg-error">' + frappe.utils.escape_html(String((r && r.message) || __("Something went wrong"))) + '</div>');
            me._set_sending(false);
          },
        });
      });
    };

    if (!this.session) {
      frappe.call({
        method: 'oly_ai.api.chat.create_session',
        args: { title: q.substring(0, 60) },
        callback: function (r) {
          var s = r && r.message;
          if (!s || !s.name) { me._set_sending(false); frappe.show_alert({ message: __("Failed to create session"), indicator: "red" }); return; }
          me.session = s.name;
          localStorage.setItem('oly_ai_session', s.name);
          me.$title.text(s.title || __("New Chat"));
          fire(s.name);
        },
        error: function () { me._set_sending(false); frappe.show_alert({ message: __("Failed to create session"), indicator: "red" }); },
      });
    } else {
      fire(this.session);
    }
  }

  // ── Streaming ──
  _setup_streaming() {
    var me = this;
    frappe.realtime.on("ai_chunk", function (data) {
      if (!data || !me._stream_task || data.task_id !== me._stream_task) return;
      me._stream_buffer = (me._stream_buffer || "") + data.chunk;
      var $el = $("#panel-stream-" + data.task_id);
      if ($el.length) { $el.html(oly_ai.render_markdown(me._stream_buffer)); me._scroll(); }
    });
    frappe.realtime.on("ai_done", function (data) {
      if (!data || !me._stream_task || data.task_id !== me._stream_task) return;
      var $el = $("#panel-stream-" + data.task_id);
      if ($el.length) {
        $el.removeClass("ai-streaming-cursor");
        var content = data.content || me._stream_buffer || "";
        var meta = [data.model, data.cost ? '$' + data.cost.toFixed(4) : ''].filter(Boolean).join(' · ');
        $el.closest('.oly-ai-msg-content').html(
          oly_ai.render_markdown(content) +
          '<div class="oly-ai-msg-footer" style="display:flex;align-items:center;gap:8px;margin-top:6px;padding-top:4px;border-top:1px solid var(--border-color);">' +
            '<span class="oly-ai-copy-btn" style="display:inline-flex;align-items:center;gap:3px;cursor:pointer;color:var(--text-muted);font-size:0.75rem;" data-text="' + frappe.utils.escape_html(content) + '">' + ICON.copy + ' Copy</span>' +
            '<span class="oly-ai-tts-btn" style="display:inline-flex;align-items:center;gap:3px;cursor:pointer;color:var(--text-muted);font-size:0.75rem;" title="Listen">' + ICON.speaker + '</span>' +
            '<span class="oly-ai-fb-btn" data-fb="up" style="display:inline-flex;align-items:center;cursor:pointer;color:var(--text-muted);padding:2px;" title="Helpful">' + ICON.thumbs_up + '</span>' +
            '<span class="oly-ai-fb-btn" data-fb="down" style="display:inline-flex;align-items:center;cursor:pointer;color:var(--text-muted);padding:2px;" title="Not helpful">' + ICON.thumbs_down + '</span>' +
            (meta ? '<span class="oly-ai-msg-meta" style="margin-left:auto;font-size:0.6875rem;color:var(--text-muted);">' + meta + '</span>' : '') +
          '</div>'
        );
        me._wire_copy();
        if (data.pending_actions && data.pending_actions.length) me._render_action_cards(data.pending_actions);
        if (data.session_title) me.$title.text(data.session_title);
      }
      me._stream_task = null;
      me._stream_buffer = "";
      me._set_sending(false);
      me.$input.focus();
      me._scroll();
      me._load_sessions();
    });
    frappe.realtime.on("ai_error", function (data) {
      if (!data || !me._stream_task || data.task_id !== me._stream_task) return;
      var $el = $("#panel-stream-" + data.task_id);
      if ($el.length) {
        var err_msg = frappe.utils.escape_html(data.error || 'Something went wrong');
        $el.removeClass("ai-streaming-cursor").closest('.oly-ai-msg-content').html(
          '<div class="oly-ai-msg-error">' + err_msg +
          '<div class="oly-retry-btn" style="margin-top:6px;cursor:pointer;color:var(--primary-color);font-size:0.8rem;font-weight:600;">' + __('↻ Try again') + '</div></div>'
        );
        $el.closest('.oly-ai-msg-content').find('.oly-retry-btn').on('click', function () {
          $(this).closest('[data-msg-idx]').remove();
          me.send(me._last_message || '');
        });
      }
      me._stream_task = null;
      me._stream_buffer = "";
      me._set_sending(false);
    });
  }

  // ── Action Cards ──
  _render_action_cards(actions) {
    var me = this;
    actions.forEach(function (action) {
      var fields_html = '';
      if (action.fields) {
        var entries = Object.entries(action.fields);
        if (entries.length) {
          fields_html = '<div class="oly-ai-action-fields">';
          entries.forEach(function (p) { fields_html += '<div><strong>' + frappe.utils.escape_html(p[0]) + ':</strong> ' + frappe.utils.escape_html(String(p[1])) + '</div>'; });
          fields_html += '</div>';
        }
      }
      var cid = 'pact-' + action.action_id;
      me.$body.append(
        '<div class="oly-ai-action-card" id="' + cid + '">' +
          '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">' +
            '<span class="oly-ai-action-badge pending">' + __("Pending") + '</span>' +
            '<span style="font-size:0.7rem;color:var(--text-muted);">' + frappe.utils.escape_html(action.action_type) + '</span>' +
          '</div>' +
          '<div style="font-size:0.8rem;color:var(--text-color);margin:4px 0;">' + frappe.utils.escape_html(action.summary || action.message) + '</div>' +
          fields_html +
          '<div style="display:flex;gap:6px;margin-top:8px;">' +
            '<button class="oly-ai-btn-approve" data-action="' + action.action_id + '">✓ ' + __("Approve") + '</button>' +
            '<button class="oly-ai-btn-reject" data-action="' + action.action_id + '">✕ ' + __("Reject") + '</button>' +
          '</div>' +
        '</div>'
      );
    });
    me.$body.find('.oly-ai-btn-approve').off('click').on('click', function () {
      var aid = $(this).data('action'), $c = $('#pact-' + aid);
      $c.find('.oly-ai-btn-approve,.oly-ai-btn-reject').hide();
      $c.append('<span style="font-size:0.75rem;color:var(--text-muted);">Executing...</span>');
      frappe.xcall('oly_ai.api.actions.approve_action', { action_name: aid }).then(function (r) {
        $c.find('.oly-ai-action-badge').removeClass('pending').addClass('executed').text(__("Done"));
        $c.find('span:last').text('✓ ' + (r.message || __("Executed")));
      }).catch(function (err) {
        $c.find('.oly-ai-action-badge').removeClass('pending').addClass('failed').text(__("Failed"));
        $c.find('span:last').text('✕ ' + (err.message || __("Failed")));
      });
    });
    me.$body.find('.oly-ai-btn-reject').off('click').on('click', function () {
      var aid = $(this).data('action');
      frappe.xcall('oly_ai.api.actions.reject_action', { action_name: aid }).then(function () {
        var $c = $('#pact-' + aid);
        $c.find('.oly-ai-action-badge').removeClass('pending').addClass('rejected').text(__("Rejected"));
        $c.find('.oly-ai-btn-approve,.oly-ai-btn-reject').hide();
      });
    });
    me._scroll();
  }

  // ── Messages ──
  _user_msg(text, idx) {
    var escaped = frappe.utils.escape_html(text);
    var idx_attr = idx ? ' data-msg-idx="' + idx + '"' : '';
    this.$body.append(
      '<div class="oly-ai-msg oly-ai-msg-user"' + idx_attr + ' style="display:flex;flex-direction:column;align-items:flex-end;margin-bottom:12px;">' +
        '<div class="oly-ai-msg-bubble-user" style="background:var(--primary-color);color:white;padding:10px 14px;font-size:0.8125rem;border-radius:18px 18px 4px 18px;max-width:82%;word-wrap:break-word;line-height:1.5;">' + escaped + '</div>' +
        '<div class="oly-ai-user-actions" style="display:flex;align-items:center;gap:6px;margin-top:2px;opacity:0;transition:opacity 0.15s;">' +
          '<span class="oly-ai-user-copy" data-text="' + escaped + '" style="display:flex;align-items:center;gap:3px;cursor:pointer;color:var(--text-muted);font-size:0.6875rem;padding:3px 4px;">' + ICON.copy + '</span>' +
          (idx ? '<span class="oly-ai-edit-btn" data-idx="' + idx + '" data-text="' + escaped + '" style="display:flex;align-items:center;gap:2px;cursor:pointer;color:var(--text-muted);font-size:0.6875rem;padding:3px 4px;" title="' + __('Edit & resend') + '"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>' : '') +
        '</div>' +
      '</div>'
    );
    var $row = this.$body.find('.oly-ai-msg-user:last');
    $row.on('mouseenter', function () {
      $(this).find('.oly-ai-user-actions').css('opacity', '1');
    }).on('mouseleave', function () {
      $(this).find('.oly-ai-user-actions').css('opacity', '0');
    });
    $row.find('.oly-ai-user-copy').on('click', function () {
      frappe.utils.copy_to_clipboard($(this).data('text'));
      var $b = $(this);
      $b.html(ICON.check);
      setTimeout(function () { $b.html(ICON.copy); }, 1500);
    });
    var me = this;
    $row.find('.oly-ai-edit-btn').on('click', function () {
      me._edit_message($(this).data('idx'), $(this).data('text'));
    });
    this._scroll();
  }

  _build_ai_msg(r) {
    var content = (r && r.content) || '';
    var meta = [r && r.model, r && r.cost ? '$' + Number(r.cost).toFixed(4) : ''].filter(Boolean).join(' · ');
    var idx = r && r.idx;
    var idx_attr = idx ? ' data-msg-idx="' + idx + '"' : '';
    var regen_btn = idx ? '<span class="oly-ai-regen-btn" data-idx="' + idx + '" style="display:inline-flex;align-items:center;gap:3px;cursor:pointer;color:var(--text-muted);font-size:0.75rem;" title="' + __('Regenerate') + '"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg></span>' : '';
    var is_image = r && r.type === 'image' && r.image_url;
    var rendered = is_image
      ? '<div style="margin:4px 0;"><img src="' + r.image_url + '" style="max-width:100%;max-height:300px;border-radius:10px;border:1px solid var(--border-color);cursor:pointer;" onclick="window.open(this.src,\'_blank\')" /></div>'
      : oly_ai.render_markdown(content);
    return '<div class="oly-ai-msg oly-ai-msg-ai"' + idx_attr + ' style="display:flex;gap:8px;margin-bottom:12px;align-items:flex-start;">' +
      _ai_avatar_html() +
      '<div class="oly-ai-msg-content" style="flex:1;min-width:0;background:var(--control-bg);border-radius:4px 18px 18px 18px;padding:10px 14px;font-size:0.8125rem;line-height:1.6;">' + rendered +
        '<div class="oly-ai-msg-footer" style="display:flex;align-items:center;gap:8px;margin-top:6px;padding-top:4px;border-top:1px solid var(--border-color);">' +
          '<span class="oly-ai-copy-btn" style="display:inline-flex;align-items:center;gap:3px;cursor:pointer;color:var(--text-muted);font-size:0.75rem;" data-text="' + frappe.utils.escape_html(content) + '">' + ICON.copy + ' ' + __("Copy") + '</span>' +
          '<span class="oly-ai-tts-btn" style="display:inline-flex;align-items:center;gap:3px;cursor:pointer;color:var(--text-muted);font-size:0.75rem;" title="' + __("Listen") + '">' + ICON.speaker + '</span>' +
          regen_btn +
          '<span class="oly-ai-fb-btn" data-fb="up" style="display:inline-flex;align-items:center;cursor:pointer;color:var(--text-muted);padding:2px;" title="' + __("Helpful") + '">' + ICON.thumbs_up + '</span>' +
          '<span class="oly-ai-fb-btn" data-fb="down" style="display:inline-flex;align-items:center;cursor:pointer;color:var(--text-muted);padding:2px;" title="' + __("Not helpful") + '">' + ICON.thumbs_down + '</span>' +
          (meta ? '<span class="oly-ai-msg-meta" style="margin-left:auto;font-size:0.6875rem;color:var(--text-muted);">' + meta + '</span>' : '') +
        '</div>' +
      '</div></div>';
  }

  _ai_msg_full(content, meta) {
    this.$body.append(this._build_ai_msg($.extend({ content: content }, meta)));
    this._wire_copy();
  }

  _wire_copy() {
    this.$body.find('.oly-ai-copy-btn').off('click').on('click', function () {
      frappe.utils.copy_to_clipboard($(this).data('text'));
      var $b = $(this);
      $b.html(ICON.check + ' Copied');
      setTimeout(function () { $b.html(ICON.copy + ' Copy'); }, 2000);
    });
    // Regenerate button
    var me = this;
    this.$body.find('.oly-ai-regen-btn').off('click').on('click', function () {
      me._regenerate($(this).data('idx'));
    });
  }

  _edit_message(idx, original_text) {
    var me = this;
    var d = new frappe.ui.Dialog({
      title: __("Edit Message"),
      fields: [{ fieldtype: 'Small Text', fieldname: 'content', default: original_text }],
      size: 'small',
      primary_action_label: __("Send"),
      primary_action: function (values) {
        if (!values.content || !values.content.trim()) return;
        d.hide();
        me._set_sending(true);
        // Remove messages from idx onward in DOM
        me.$body.find('.oly-ai-msg').each(function () {
          var $el = $(this);
          var mi = parseInt($el.attr('data-msg-idx'));
          if (mi && mi >= idx) $el.remove();
        });
        me._user_msg(values.content.trim());
        me.$body.append('<div class="oly-ai-loading" style="display:flex;gap:8px;align-items:flex-start;margin-bottom:12px;">' + _ai_avatar_html() + '<div class="oly-ai-typing"><span></span><span></span><span></span></div></div>');
        me._scroll();
        frappe.call({
          method: "oly_ai.api.chat.edit_message",
          args: { session_name: me.session, message_idx: idx, new_content: values.content.trim(), model: me.current_model, mode: me.current_mode },
          callback: function (r) {
            me.$body.find('.oly-ai-loading').remove();
            me._set_sending(false);
            if (r && r.message) {
              me._ai_msg_full(r.message.content || '', r.message);
              me._scroll();
            }
          },
          error: function () {
            me.$body.find('.oly-ai-loading').remove();
            me._set_sending(false);
            me.$body.append('<div class="oly-ai-msg-error" style="margin:8px 34px;padding:8px 12px;font-size:0.8rem;color:var(--red);border:1px solid var(--red);border-radius:8px;">' + __("Failed to edit message") + '</div>');
          },
        });
      },
    });
    d.show();
  }

  _regenerate(idx) {
    var me = this;
    me._set_sending(true);
    // Remove the AI message (and anything after it) in DOM
    me.$body.find('.oly-ai-msg').each(function () {
      var $el = $(this);
      var mi = parseInt($el.attr('data-msg-idx'));
      if (mi && mi >= idx) $el.remove();
    });
    me.$body.append('<div class="oly-ai-loading" style="display:flex;gap:8px;align-items:flex-start;margin-bottom:12px;">' + _ai_avatar_html() + '<div class="oly-ai-typing"><span></span><span></span><span></span></div></div>');
    me._scroll();
    frappe.call({
      method: "oly_ai.api.chat.regenerate_response",
      args: { session_name: me.session, message_idx: idx, model: me.current_model, mode: me.current_mode },
      callback: function (r) {
        me.$body.find('.oly-ai-loading').remove();
        me._set_sending(false);
        if (r && r.message) {
          // Re-open session to get fresh idx values
          me._open_session(me.session);
        }
      },
      error: function () {
        me.$body.find('.oly-ai-loading').remove();
        me._set_sending(false);
        me.$body.append('<div class="oly-ai-msg-error" style="margin:8px 34px;padding:8px 12px;font-size:0.8rem;color:var(--red);border:1px solid var(--red);border-radius:8px;">' + __("Failed to regenerate") + '</div>');
      },
    });
  }

  _scroll() {
    var el = this.$body[0];
    if (el) setTimeout(function () { el.scrollTop = el.scrollHeight; }, 50);
  }

  // ── Voice: Recording ──
  _start_recording() {
    var me = this;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      frappe.show_alert({ message: __('Your browser does not support microphone access'), indicator: 'red' });
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      me._recording = true;
      me._audio_chunks = [];
      me._rec_stream = stream;
      var options = MediaRecorder.isTypeSupported('audio/webm') ? { mimeType: 'audio/webm' } : {};
      me._media_recorder = new MediaRecorder(stream, options);
      me._media_recorder.ondataavailable = function (e) {
        if (e.data.size > 0) me._audio_chunks.push(e.data);
      };
      me._media_recorder.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop(); });
        var blob = new Blob(me._audio_chunks, { type: me._media_recorder.mimeType || 'audio/webm' });
        me._audio_chunks = [];
        me._send_voice(blob);
      };
      me._media_recorder.start();
      // Visual: red pulsing mic
      me.$mic.css({ background: 'var(--red)', color: 'white', 'border-radius': '50%' });
      me.$mic.html('<svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/></svg>');
      me.$mic.css('animation', 'oly-pulse 1.2s ease-in-out infinite');
      // Inject keyframes if not present
      if (!document.getElementById('oly-pulse-kf')) {
        var style = document.createElement('style');
        style.id = 'oly-pulse-kf';
        style.textContent = '@keyframes oly-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.7;transform:scale(1.1)}}';
        document.head.appendChild(style);
      }
      // Auto-stop after 60s
      me._rec_timer = setTimeout(function () { if (me._recording) me._stop_recording(); }, 60000);
    }).catch(function (err) {
      console.error('Mic access denied:', err);
      frappe.show_alert({ message: __('Microphone access denied'), indicator: 'orange' });
    });
  }

  _stop_recording() {
    this._recording = false;
    if (this._rec_timer) { clearTimeout(this._rec_timer); this._rec_timer = null; }
    if (this._media_recorder && this._media_recorder.state !== 'inactive') {
      this._media_recorder.stop();
    }
    // Reset mic button
    this.$mic.css({ background: 'transparent', color: 'var(--text-muted)', animation: 'none' });
    this.$mic.html(ICON.mic);
  }

  _send_voice(blob) {
    var me = this;
    // Show transcribing indicator
    me.$input.attr('placeholder', __('Transcribing...'));
    me.$mic.css('opacity', '0.5').css('pointer-events', 'none');

    var fd = new FormData();
    fd.append('audio', blob, 'voice.webm');

    $.ajax({
      url: '/api/method/oly_ai.api.voice.voice_to_text',
      type: 'POST',
      data: fd,
      processData: false,
      contentType: false,
      headers: { 'X-Frappe-CSRF-Token': frappe.csrf_token },
      success: function (r) {
        var text = (r && r.message && r.message.text) || '';
        if (text) {
          me.$input.val(text);
          me.$input[0].style.height = 'auto';
          me.$input[0].style.height = Math.min(me.$input[0].scrollHeight, 120) + 'px';
          // Auto-send the transcribed text
          me.send();
        } else {
          frappe.show_alert({ message: __('Could not transcribe audio'), indicator: 'orange' });
        }
      },
      error: function (xhr) {
        var msg = __('Transcription failed');
        try { msg = JSON.parse(xhr.responseText)._server_messages; msg = JSON.parse(msg); msg = JSON.parse(msg[0]).message; } catch(e) {}
        frappe.show_alert({ message: msg, indicator: 'red' });
      },
      complete: function () {
        me.$mic.css('opacity', '1').css('pointer-events', 'auto');
        var ph = { ask: __('Ask anything...'), research: __('Research in depth...'), agent: __('Describe what you need...'), execute: __('What action to execute?') };
        me.$input.attr('placeholder', ph[me.current_mode] || ph.ask);
      }
    });
  }

  // ── Voice: TTS Playback ──
  _play_tts($btn, text) {
    var me = this;
    if (!text || !text.trim()) return;
    // If already playing, stop
    if (me._tts_audio && !me._tts_audio.paused) {
      me._tts_audio.pause();
      me._tts_audio = null;
      $btn.html(ICON.speaker).css('color', 'var(--text-muted)');
      return;
    }
    // Limit text sent to TTS
    var send_text = text.trim().substring(0, 4096);
    $btn.html('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite"><circle cx="12" cy="12" r="10" stroke-dasharray="30 60"/></svg>').css('color', oly_ai.brand_color());
    frappe.call({
      method: 'oly_ai.api.voice.text_to_speech',
      args: { text: send_text },
      callback: function (r) {
        var data = r && r.message;
        if (data && data.audio_base64) {
          var audio = new Audio('data:' + (data.content_type || 'audio/mpeg') + ';base64,' + data.audio_base64);
          me._tts_audio = audio;
          $btn.html(ICON.stop).css('color', oly_ai.brand_color());
          audio.onended = function () { $btn.html(ICON.speaker).css('color', 'var(--text-muted)'); me._tts_audio = null; };
          audio.onerror = function () { $btn.html(ICON.speaker).css('color', 'var(--text-muted)'); me._tts_audio = null; };
          audio.play();
        } else {
          $btn.html(ICON.speaker).css('color', 'var(--text-muted)');
          frappe.show_alert({ message: __('TTS failed'), indicator: 'red' });
        }
      },
      error: function () {
        $btn.html(ICON.speaker).css('color', 'var(--text-muted)');
        frappe.show_alert({ message: __('TTS failed'), indicator: 'red' });
      }
    });
  }

  // ── @Mention autocomplete ──
  _search_doctypes(query) {
    var me = this;
    frappe.xcall('oly_ai.api.chat.get_doctype_suggestions', { query: query }).then(function (results) {
      var $dd = me.$panel.find('#panel-mention-dropdown');
      if (!results || !results.length) { $dd.hide().empty(); return; }
      var html = '';
      results.forEach(function (r, i) {
        html += '<div class="oly-mention-item' + (i === 0 ? ' active' : '') + '" data-doctype="' + frappe.utils.escape_html(r.name) + '"' +
          ' style="display:flex;align-items:center;gap:10px;padding:8px 12px;cursor:pointer;font-size:0.8125rem;color:var(--text-color);transition:background .1s;">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18"/><path d="M3 9h18"/></svg>' +
          '<span style="font-weight:600;">' + frappe.utils.escape_html(r.name) + '</span>' +
          '<span style="font-size:0.7rem;color:var(--text-muted);">' + frappe.utils.escape_html(r.module || '') + '</span>' +
        '</div>';
      });
      $dd.html(html).show();
      $dd.find('.oly-mention-item').on('click', function () {
        me._insert_mention($(this).data('doctype'));
      }).on('mouseenter', function () {
        $dd.find('.oly-mention-item').removeClass('active');
        $(this).addClass('active');
      });
    });
  }

  _insert_mention(doctype) {
    var $dd = this.$panel.find('#panel-mention-dropdown');
    $dd.hide().empty();
    var el = this.$input[0];
    var val = el.value;
    var pos = el.selectionStart;
    var before = val.substring(0, pos);
    var after = val.substring(pos);
    var new_before = before.replace(/@[A-Za-z\s]{1,40}$/, '@' + doctype + ':');
    el.value = new_before + after;
    var new_pos = new_before.length;
    el.setSelectionRange(new_pos, new_pos);
    el.focus();
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    // Auto-trigger document search
    this._mention_mode = 'document';
    this._mention_doctype = doctype;
    this._search_documents(doctype, '');
  }

  _search_documents(doctype, query) {
    var me = this;
    frappe.xcall('oly_ai.api.chat.get_document_suggestions', { doctype: doctype, query: query }).then(function (results) {
      var $dd = me.$panel.find('#panel-mention-dropdown');
      if (!results || !results.length) {
        $dd.html('<div style="padding:10px 14px;color:var(--text-muted);font-size:0.75rem;">' + __('Type to search or press Space for schema only') + '</div>').show();
        return;
      }
      var html = '<div style="padding:6px 12px;font-size:0.7rem;color:var(--text-muted);border-bottom:1px solid var(--border-color);">' + frappe.utils.escape_html(doctype) + ' — ' + __('Select or Space for schema') + '</div>';
      results.forEach(function (r, i) {
        var display = frappe.utils.escape_html(r.name);
        if (r.title) display += ' <span style="color:var(--text-muted);font-size:0.7rem;">— ' + frappe.utils.escape_html(r.title) + '</span>';
        html += '<div class="oly-mention-item' + (i === 0 ? ' active' : '') + '" data-docname="' + frappe.utils.escape_html(r.name) + '"' +
          ' style="display:flex;align-items:center;gap:10px;padding:8px 12px;cursor:pointer;font-size:0.8125rem;color:var(--text-color);transition:background .1s;">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>' +
          '<span>' + display + '</span>' +
        '</div>';
      });
      $dd.html(html).show();
      $dd.find('.oly-mention-item').on('click', function () {
        me._insert_doc_mention($(this).data('docname'));
      }).on('mouseenter', function () {
        $dd.find('.oly-mention-item').removeClass('active');
        $(this).addClass('active');
      });
    });
  }

  _insert_doc_mention(docname) {
    var $dd = this.$panel.find('#panel-mention-dropdown');
    $dd.hide().empty();
    this._mention_mode = 'doctype';
    this._mention_doctype = null;
    var el = this.$input[0];
    var val = el.value;
    var pos = el.selectionStart;
    var before = val.substring(0, pos);
    var after = val.substring(pos);
    var new_before = before.replace(/@([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,4}):[^\s]*$/, '@$1:' + docname + ' ');
    el.value = new_before + after;
    var new_pos = new_before.length;
    el.setSelectionRange(new_pos, new_pos);
    el.focus();
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }
};

// ─── Page Context Detection ──────────────────────────────────
oly_ai.get_page_context = function () {
  var ctx = { doctype: null, docname: null, list_doctype: null, route: frappe.get_route_str() || '' };
  // Form view — cur_frm is set when user is on a document form
  if (typeof cur_frm !== 'undefined' && cur_frm && cur_frm.doctype && cur_frm.docname && !cur_frm.is_new()) {
    ctx.doctype = cur_frm.doctype;
    ctx.docname = cur_frm.docname;
  }
  // List view — detect when browsing a DocType list
  if (!ctx.doctype && typeof cur_list !== 'undefined' && cur_list && cur_list.doctype) {
    ctx.list_doctype = cur_list.doctype;
  }
  return ctx;
};

// ─── Breadcrumb Tracker — last 5 pages for workflow context ──
oly_ai._page_trail = [];
oly_ai._track_page = function () {
  var ctx = oly_ai.get_page_context();
  var entry = { route: ctx.route, doctype: ctx.doctype, docname: ctx.docname, list_doctype: ctx.list_doctype, ts: Date.now() };
  var trail = oly_ai._page_trail;
  // Don't duplicate consecutive visits to same page
  if (trail.length && trail[trail.length - 1].route === entry.route) return;
  trail.push(entry);
  if (trail.length > 5) trail.shift();
};

$(document).on('page-change.oly_ai_trail', function () {
  setTimeout(function () { oly_ai._track_page(); }, 500);
});

// ─── Initialize ──────────────────────────────────────────────
$(function () {
  if (frappe.boot && frappe.boot.user) {
    setTimeout(function () {
      oly_ai.panel = new oly_ai.Panel();
      oly_ai._track_page();
    }, 300);
  }
});
