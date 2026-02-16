/* Oly AI — Global Bundle
 * Architecture mirrors Frappe Chat EXACTLY:
 *   - Single fixed wrapper appended to <body>
 *   - Panel inside wrapper, hidden by default (.hide())
 *   - Bubble inside wrapper
 *   - fadeIn/fadeOut for show/hide
 *   - Navbar sparkles icon
 *   - $(document).mouseup() for click-outside-close
 */
frappe.provide("oly_ai");

// ─── Icons ───────────────────────────────────────────────────
const ICON = {
sparkles: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/></svg>',
sparkles_lg: '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/></svg>',
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
};
oly_ai.ICON = ICON;

// ─── Markdown Helper ─────────────────────────────────────────
oly_ai.render_markdown = function (md) {
  if (!md) return "";
  return '<div class="ai-md">' + frappe.markdown(md) + "</div>";
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
  features.forEach(function (f) { frm.add_custom_button(__(f), function () { oly_ai.show_assist_dialog(frm, f); }, __("AI Assist")); });
  frm.add_custom_button(__("Ask AI..."), function () { oly_ai.show_custom_prompt(frm); }, __("AI Assist"));
};

// ═══════════════════════════════════════════════════════════════
// AI PANEL — Mirrors Chat EXACTLY:
//   .chat-app         → .oly-ai-app      (fixed wrapper)
//   .chat-element     → .oly-ai-element   (panel, hidden by default)
//   #chat-bubble      → #oly-ai-bubble    (FAB)
//   .chat-navbar-icon → .oly-ai-nav       (navbar icon)
//   fadeIn(250)        → fadeIn(250)
//   fadeOut(300)        → fadeOut(300)
//   $(document).mouseup → $(document).mouseup
// ═══════════════════════════════════════════════════════════════
oly_ai.Panel = class {
  constructor() {
    this.is_open = false;
    this.session = null;
    this.sending = false;
    this.create_app();
  }

  /** Create all elements — mirrors frappe.Chat.create_app() */
  create_app() {
    var me = this;

    // 1. Wrapper — exactly like Chat's .chat-app
    //    INLINE STYLES guarantee positioning regardless of CSS loading
    this.$app = $(document.createElement('div'));
    this.$app.addClass('oly-ai-app');
    this.$app.css({
      'position': 'fixed',
      'bottom': '24px',
      'right': '0px',
      'display': 'flex',
      'flex-direction': 'column',
      'align-items': 'flex-end',
      'justify-content': 'flex-end',
      'width': '100%',
      'max-width': '420px',
      'z-index': '1050',
      'padding': '0 1rem'
    });
    $('body').append(this.$app);

    // 2. Panel element — exactly like Chat's .chat-element
    //    Hidden by default with .hide(), shown with .fadeIn(250)
    this.$panel = $(document.createElement('div'));
    this.$panel.addClass('oly-ai-element');
    this.$panel.hide(); // HIDDEN BY DEFAULT — just like Chat

    // Cross/close button — exactly like Chat's .chat-cross-button
    this.$panel.append(
      '<span class="oly-ai-cross" style="display:none;position:absolute;top:12px;right:8px;cursor:pointer;color:var(--gray-700);z-index:5;">' +
      ICON.close_icon + '</span>'
    );

    // Container for content
    this.$container = $(document.createElement('div'));
    this.$container.addClass('oly-ai-container');

    // Header
    this.$container.append(
      '<div class="oly-ai-header">' +
      '  <div class="oly-ai-header-brand">' + ICON.sparkles + ' <span>' + __("AI Assistant") + '</span></div>' +
      '  <div class="oly-ai-header-actions">' +
      '    <a href="/app/ask-ai" class="oly-ai-hact" title="' + __("Full page") + '">' + ICON.expand + '</a>' +
      '    <span class="oly-ai-hact" data-action="new" title="' + __("New chat") + '">' + ICON.plus + '</span>' +
      '  </div>' +
      '</div>'
    );

    // Body (messages / welcome)
    this.$body = $(document.createElement('div'));
    this.$body.addClass('oly-ai-body');
    this.$container.append(this.$body);

    // Input area
    this.$container.append(
      '<div class="oly-ai-actions">' +
      '  <textarea class="oly-ai-input" rows="1" placeholder="' + __("Ask anything...") + '" maxlength="4000"></textarea>' +
      '  <span class="oly-ai-send-btn">' + ICON.send + '</span>' +
      '</div>' +
      '<a href="/app/ask-ai" class="oly-ai-expand-link">' + __("Open full page") + ' &rarr;</a>'
    );

    this.$panel.append(this.$container);
    this.$panel.appendTo(this.$app);

    // References
    this.$input = this.$panel.find('.oly-ai-input');
    this.$send = this.$panel.find('.oly-ai-send-btn');

    // 3. Bubble/FAB — exactly like Chat's #chat-bubble
    //    On desk, bubble is hidden (d-none) — navbar is the trigger
    //    On portal/website, bubble is visible
    this.is_desk = 'desk' in frappe;
    this.open_title = __('AI Assistant');
    this.closed_title = __('Close');
    var bubble_visible = this.is_desk ? ' d-none' : '';

    this.open_bubble_html =
      '<div class="oly-ai-bubble' + bubble_visible + '">' +
      '  <span class="oly-ai-bubble-icon">' + ICON.sparkles_lg + '</span>' +
      '</div>';

    this.closed_bubble_html =
      '<div class="oly-ai-bubble oly-ai-bubble-closed' + bubble_visible + '">' +
      '  <span>' + ICON.close_icon + '</span>' +
      '</div>';

    this.$bubble = $(document.createElement('div'));
    this.$bubble.attr({ title: this.open_title, id: 'oly-ai-bubble' });
    this.$bubble.html(this.open_bubble_html);
    this.$app.append(this.$bubble);

    // 4. Navbar icon — exactly like Chat's .chat-navbar-icon
    var navbar_icon_html =
      '<li class="nav-item dropdown dropdown-notifications dropdown-mobile oly-ai-nav" title="' + __('AI Assistant') + '">' +
      ICON.sparkles +
      '</li>';

    if (this.is_desk) {
      $('header.navbar > .container > .navbar-collapse > ul').prepend(navbar_icon_html);
    }

    // Show welcome
    this.show_welcome();

    // Setup events
    this.setup_events();
  }

  /** Show the panel — exactly like Chat's show_chat_widget() */
  show_chat_widget() {
    this.is_open = true;
    this.$panel.fadeIn(250);
    this.$input.focus();
  }

  /** Hide the panel — exactly like Chat's hide_chat_widget() */
  hide_chat_widget() {
    this.is_open = false;
    this.$panel.fadeOut(300);
  }

  /** Toggle bubble state — exactly like ChatBubble.change_bubble() */
  change_bubble() {
    this.is_open = !this.is_open;
    if (this.is_open === false) {
      this.$bubble.attr({ title: this.open_title }).html(this.open_bubble_html);
      this.hide_chat_widget();
    } else {
      this.$bubble.attr({ title: this.closed_title }).html(this.closed_bubble_html);
      this.show_chat_widget();
    }
  }

  /** Should close on outside click — exactly like Chat's should_close() */
  should_close(e) {
    var app = $('.oly-ai-app');
    var navbar = $('.navbar');
    var modal = $('.modal');
    return (
      !app.is(e.target) && app.has(e.target).length === 0 &&
      !navbar.is(e.target) && navbar.has(e.target).length === 0 &&
      !modal.is(e.target) && modal.has(e.target).length === 0
    );
  }

  /** Wire up all events — exactly like Chat's setup_events() */
  setup_events() {
    var me = this;

    // Navbar click
    $('.oly-ai-nav').on('click', function () {
      me.change_bubble();
    });

    // Bubble click
    $('#oly-ai-bubble').on('click', function () {
      me.change_bubble();
    });

    // Cross button (mobile)
    this.$panel.find('.oly-ai-cross').on('click', function () {
      me.change_bubble();
    });

    // Click outside to close — exactly like Chat
    $(document).mouseup(function (e) {
      if (me.should_close(e) && me.is_open === true) {
        me.change_bubble();
      }
    });

    // New chat button
    this.$panel.find('[data-action="new"]').on('click', function () {
      me.new_chat();
    });

    // Send button
    this.$send.on('click', function () { me.send(); });

    // Enter to send
    this.$input.on('keydown', function (e) {
      if (e.which === 13 && !e.shiftKey) {
        e.preventDefault();
        me.send();
      }
    });

    // Auto-resize textarea
    this.$input.on('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });

    // Escape to close
    $(document).on('keydown.oly_ai', function (e) {
      if (e.key === 'Escape' && me.is_open) me.change_bubble();
    });
  }

  show_welcome() {
    var chips = [
      __("How do I create a Sales Order?"),
      __("What is our leave policy?"),
      __("Explain the purchase workflow"),
      __("How to submit a timesheet?"),
    ];
    this.$body.html(
      '<div class="oly-ai-welcome">' +
      '  <div class="oly-ai-welcome-icon">' + ICON.sparkles_lg + '</div>' +
      '  <h3>' + __("How can I help?") + '</h3>' +
      '  <div class="oly-ai-chips">' +
      chips.map(function (c) { return '<div class="oly-ai-chip">' + c + '</div>'; }).join('') +
      '  </div>' +
      '</div>'
    );
    var me = this;
    this.$body.find('.oly-ai-chip').on('click', function () {
      me.$input.val($(this).text().trim());
      me.send();
    });
  }

  new_chat() {
    this.session = null;
    this.show_welcome();
    this.$input.val('').css('height', 'auto').focus();
  }

  send() {
    var q = this.$input.val().trim();
    if (!q || this.sending) return;
    this.sending = true;
    this.$input.val('').css('height', 'auto');

    var me = this;
    var fire = function (sid) {
      me.$body.find('.oly-ai-welcome').remove();
      me._user_msg(q);

      var lid = 'oly-t-' + Date.now();
      me.$body.append(
        '<div class="oly-ai-msg oly-ai-msg-ai" id="' + lid + '">' +
        '<div class="oly-ai-msg-avatar oly-ai-msg-avatar-ai">' + ICON.sparkles + '</div>' +
        '<div class="oly-ai-msg-content"><div class="oly-ai-typing"><span></span><span></span><span></span></div></div></div>'
      );
      me._scroll();

      frappe.xcall('oly_ai.api.chat.send_message', { session_name: sid, message: q })
        .then(function (r) {
          $('#' + lid).replaceWith(me._ai_msg(r));
          me._wire_copy();
          me._scroll();
          me.sending = false;
          me.$input.focus();
        })
        .catch(function (err) {
          $('#' + lid).replaceWith(
            '<div class="oly-ai-msg oly-ai-msg-ai"><div class="oly-ai-msg-avatar oly-ai-msg-avatar-err">!</div>' +
            '<div class="oly-ai-msg-content oly-ai-msg-error">' + (err.message || 'Something went wrong') + '</div></div>'
          );
          me.sending = false;
        });
    };

    if (!this.session) {
      frappe.xcall('oly_ai.api.chat.create_session', { title: q.substring(0, 60) })
        .then(function (s) { me.session = s.name; fire(s.name); });
    } else {
      fire(this.session);
    }
  }

  _user_msg(text) {
    var init = (frappe.session.user_fullname || 'U').charAt(0).toUpperCase();
    this.$body.append(
      '<div class="oly-ai-msg oly-ai-msg-user">' +
      '<div class="oly-ai-msg-content">' +
      '<div class="oly-ai-msg-bubble-user">' + frappe.utils.escape_html(text) + '</div>' +
      '</div>' +
      '<div class="oly-ai-msg-avatar oly-ai-msg-avatar-user">' + init + '</div></div>'
    );
    this._scroll();
  }

  _ai_msg(r) {
    var meta = [r.model, r.cost ? '$' + r.cost.toFixed(4) : ''].filter(Boolean).join(' · ');
    return '<div class="oly-ai-msg oly-ai-msg-ai">' +
      '<div class="oly-ai-msg-avatar oly-ai-msg-avatar-ai">' + ICON.sparkles + '</div>' +
      '<div class="oly-ai-msg-content">' +
      oly_ai.render_markdown(r.content) +
      '<div class="oly-ai-msg-footer">' +
      '<span class="oly-ai-copy-btn" data-text="' + frappe.utils.escape_html(r.content) + '">' + ICON.copy + ' Copy</span>' +
      (meta ? '<span class="oly-ai-msg-meta">' + meta + '</span>' : '') +
      '</div></div></div>';
  }

  _wire_copy() {
    this.$body.find('.oly-ai-copy-btn').off('click').on('click', function () {
      frappe.utils.copy_to_clipboard($(this).data('text'));
      var $b = $(this);
      $b.html(ICON.check + ' Copied');
      setTimeout(function () { $b.html(ICON.copy + ' Copy'); }, 2000);
    });
  }

  _scroll() {
    var el = this.$body[0];
    if (el) setTimeout(function () { el.scrollTop = el.scrollHeight; }, 50);
  }
};

// ─── Initialize — exactly like Chat ─────────────────────────
$(function () {
  if (frappe.boot && frappe.boot.user) {
    setTimeout(function () {
      oly_ai.panel = new oly_ai.Panel();
    }, 300);
  }
});
