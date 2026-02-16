/* Ask AI — Full Page ChatGPT-style Experience
 * ALL styles inline since external CSS doesn't load reliably.
 * Uses oly_ai.ICON + oly_ai.render_markdown from bundle.
 */
frappe.pages["ask-ai"].on_page_load = function (wrapper) {
  var page = frappe.ui.make_app_page({
    parent: wrapper,
    title: __("Ask AI"),
    single_column: true,
  });

  /* ── Inject scoped CSS for hover/active states + animations ── */
  if (!document.getElementById('oly-fp-styles')) {
    var styleEl = document.createElement('style');
    styleEl.id = 'oly-fp-styles';
    styleEl.textContent = [
      '.oly-fp-sb-item:hover{background:var(--bg-light-gray);}',
      '.oly-fp-sb-item.active{background:var(--primary-color);color:white;}',
      '.oly-fp-sb-item.active .oly-fp-sb-item-title{color:white;}',
      '.oly-fp-sb-item .oly-fp-sb-item-acts{opacity:0;transition:opacity .15s;}',
      '.oly-fp-sb-item:hover .oly-fp-sb-item-acts{opacity:1;}',
      '.oly-fp-sb-item.active:hover .oly-fp-sb-item-acts{opacity:1;}',
      '.oly-fp-sb-act:hover{color:var(--primary-color);}',
      '.oly-fp-sb-new:hover{background:var(--primary-color) !important;color:white !important;}',
      '.oly-fp-sb-new:hover svg{stroke:white;}',
      '.oly-fp .oly-ai-chip:hover{background:var(--bg-light-gray);border-color:var(--primary-color);}',
      '.oly-fp .oly-ai-input:focus{border-color:var(--primary-color);}',
      '.oly-fp .oly-ai-send-btn:hover{opacity:0.85;}',
      '.oly-fp .oly-ai-copy-btn:hover{color:var(--primary-color);}',
      /* typing dots */
      '.oly-ai-typing{display:flex;gap:4px;padding:8px 0;}',
      '.oly-ai-typing span{width:8px;height:8px;border-radius:50%;background:var(--text-muted);animation:oly-dot 1.4s infinite both;}',
      '.oly-ai-typing span:nth-child(2){animation-delay:0.2s;}',
      '.oly-ai-typing span:nth-child(3){animation-delay:0.4s;}',
      '@keyframes oly-dot{0%,80%,100%{opacity:0.3;transform:scale(0.8);}40%{opacity:1;transform:scale(1);}}',
      /* markdown */
      '.ai-md{line-height:1.65;font-size:0.9rem;}',
      '.ai-md p{margin:0 0 0.6em;}',
      '.ai-md pre{background:var(--control-bg);border:1px solid var(--dark-border-color);border-radius:6px;padding:12px;overflow-x:auto;font-size:0.8rem;margin:0.6em 0;}',
      '.ai-md code{font-family:monospace;font-size:0.85em;}',
      '.ai-md ul,.ai-md ol{padding-left:1.5em;margin:0.4em 0;}',
      '.ai-md table{border-collapse:collapse;width:100%;margin:0.6em 0;}',
      '.ai-md th,.ai-md td{border:1px solid var(--dark-border-color);padding:6px 10px;text-align:left;font-size:0.85rem;}',
      '.ai-md th{background:var(--control-bg);font-weight:600;}',
      /* sidebar closed */
      '.fp-sidebar-closed .oly-fp-sidebar{display:none !important;}',
    ].join('\n');
    document.head.appendChild(styleEl);
  }

  // Hide Frappe page-head
  var $w = $(wrapper);
  $w.find(".page-head").hide();

  // State
  var current_session = null;
  var sessions = [];
  var sending = false;
  var sidebar_open = true;

  var I = oly_ai.ICON;
  var user_init = (frappe.session.user_fullname || "U").charAt(0).toUpperCase();

  var suggestions = [
    __("How do I create a Sales Order?"),
    __("What is our leave policy?"),
    __("Explain the purchase workflow"),
    __("How to submit a timesheet?"),
  ];

  // ── Build Layout — all styles inline ──
  page.main.html(
    /* Root container — full viewport height, flex row */
    '<div class="oly-fp" id="oly-fp" style="display:flex;height:calc(100vh - 60px);margin:-15px;overflow:hidden;font-family:var(--font-stack);color:var(--text-color);background:var(--bg-color);">' +

    /* ── Sidebar ── */
    '<div class="oly-fp-sidebar" id="oly-fp-sidebar" style="width:260px;min-width:260px;background:var(--card-bg);border-right:1px solid var(--dark-border-color);display:flex;flex-direction:column;overflow:hidden;">' +
      /* New chat btn */
      '<div style="padding:12px;">' +
        '<button class="oly-fp-sb-new" id="fp-new" style="width:100%;display:flex;align-items:center;gap:8px;padding:10px 14px;border:1px solid var(--dark-border-color);border-radius:8px;background:transparent;color:var(--text-color);cursor:pointer;font-size:0.875rem;font-weight:500;">' +
          I.plus + '<span>' + __("New chat") + '</span>' +
        '</button>' +
      '</div>' +
      /* Search */
      '<div style="padding:0 12px 8px;">' +
        '<input type="text" id="fp-search" placeholder="' + __("Search...") + '" style="width:100%;padding:8px 12px;border:1px solid var(--dark-border-color);border-radius:8px;background:var(--control-bg);color:var(--text-color);font-size:0.8125rem;outline:none;font-family:inherit;" />' +
      '</div>' +
      /* Session list */
      '<div class="oly-fp-sb-list" id="fp-list" style="flex:1;overflow-y:auto;padding:0 8px;"></div>' +
      /* User info */
      '<div style="padding:12px;border-top:1px solid var(--dark-border-color);">' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
          '<div style="width:32px;height:32px;border-radius:50%;background:var(--primary-color);color:white;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.8rem;flex-shrink:0;">' + user_init + '</div>' +
          '<span style="font-size:0.8125rem;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + (frappe.session.user_fullname || frappe.session.user) + '</span>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* ── Main area ── */
    '<div class="oly-fp-main" style="flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;">' +
      /* Top bar */
      '<div style="display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid var(--dark-border-color);flex-shrink:0;gap:12px;">' +
        '<button class="oly-fp-toggle" id="fp-toggle" title="' + __("Toggle sidebar") + '" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:4px;display:flex;">' + I.menu + '</button>' +
        '<span id="fp-title" style="font-weight:600;font-size:1rem;color:var(--heading-color);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + __("New Chat") + '</span>' +
        '<span style="font-size:0.75rem;color:var(--text-muted);background:var(--control-bg);padding:3px 10px;border-radius:20px;">GPT-4o-mini</span>' +
      '</div>' +
      /* Messages area */
      '<div id="fp-msgs" style="flex:1;overflow-y:auto;padding:24px 16px;"></div>' +
      /* Input area */
      '<div style="padding:0 16px 16px;flex-shrink:0;">' +
        '<div style="max-width:850px;margin:0 auto;display:flex;align-items:flex-end;gap:10px;border:1px solid var(--dark-border-color);border-radius:16px;padding:8px 12px;background:var(--control-bg);">' +
          '<textarea class="oly-ai-input" id="fp-input" rows="1" placeholder="' + __("Message AI...") + '" maxlength="4000" style="flex:1;border:none;background:transparent;color:var(--text-color);font-size:0.9rem;resize:none;min-height:24px;max-height:150px;line-height:1.5;outline:none;font-family:inherit;padding:4px 0;"></textarea>' +
          '<span class="oly-ai-send-btn" id="fp-send" style="cursor:pointer;height:32px;width:32px;min-width:32px;border-radius:50%;background:var(--primary-color);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + I.send + '</span>' +
        '</div>' +
        '<p style="text-align:center;font-size:0.7rem;color:var(--text-muted);margin:8px 0 0;">' + __("AI can make mistakes. Verify important information.") + '</p>' +
      '</div>' +
    '</div>' +

    '</div>'
  );

  var $fp = $("#oly-fp");
  var $list = $("#fp-list");
  var $msgs = $("#fp-msgs");
  var $input = $("#fp-input");
  var $send = $("#fp-send");
  var $title = $("#fp-title");

  // ── Welcome ──
  function show_welcome() {
    $msgs.html(
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:20px;">' +
        '<div style="color:var(--primary-color);margin-bottom:12px;">' + I.sparkles_lg + '</div>' +
        '<h3 style="font-size:1.5rem;font-weight:600;color:var(--heading-color);margin-bottom:20px;">' + __("How can I help you today?") + '</h3>' +
        '<div class="oly-ai-chips-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:520px;width:100%;">' +
          suggestions.map(function (s) {
            return '<div class="oly-ai-chip" style="background:var(--control-bg);border:1px solid var(--dark-border-color);border-radius:12px;padding:14px 16px;color:var(--text-color);font-size:0.875rem;cursor:pointer;text-align:left;line-height:1.4;transition:background .15s,border-color .15s;">' + s + '</div>';
          }).join('') +
        '</div>' +
      '</div>'
    );
    $msgs.find(".oly-ai-chip").on("click", function () {
      $input.val($(this).text().trim());
      send_message();
    });
  }

  // ── Sessions ──
  function load_sessions() {
    frappe.xcall("oly_ai.api.chat.get_sessions").then(function (data) {
      sessions = data || [];
      render_sessions(sessions);
    });
  }

  function render_sessions(list) {
    if (!list.length) {
      $list.html('<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.8125rem;">' + __("No conversations yet") + '</div>');
      return;
    }
    var groups = group_by_date(list);
    var html = "";
    groups.forEach(function (g) {
      html += '<div style="margin-bottom:4px;">';
      html += '<div style="padding:8px 8px 4px;font-size:0.7rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">' + g.label + '</div>';
      g.items.forEach(function (s) {
        var active = current_session === s.name ? " active" : "";
        html += '<div class="oly-fp-sb-item' + active + '" data-name="' + s.name + '" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;font-size:0.8125rem;color:var(--text-color);position:relative;transition:background .12s;">';
        html += '<span style="display:flex;flex-shrink:0;color:var(--text-muted);">' + I.chat + '</span>';
        html += '<span class="oly-fp-sb-item-title" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + frappe.utils.escape_html(s.title || __("Untitled")) + '</span>';
        html += '<span class="oly-fp-sb-item-acts" style="display:flex;gap:2px;flex-shrink:0;">';
        html += '<button class="oly-fp-sb-act" data-act="edit" data-name="' + s.name + '" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:2px;display:flex;">' + I.edit + '</button>';
        html += '<button class="oly-fp-sb-act" data-act="delete" data-name="' + s.name + '" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:2px;display:flex;">' + I.trash + '</button>';
        html += '</span>';
        html += '</div>';
      });
      html += '</div>';
    });
    $list.html(html);
    $list.find(".oly-fp-sb-item").on("click", function (e) {
      if ($(e.target).closest(".oly-fp-sb-act").length) return;
      open_session($(this).data("name"));
    });
    $list.find('[data-act="edit"]').on("click", function (e) {
      e.stopPropagation(); rename_session($(this).data("name"));
    });
    $list.find('[data-act="delete"]').on("click", function (e) {
      e.stopPropagation(); delete_session($(this).data("name"));
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
      if (!msgs || !msgs.length) { show_welcome(); return; }
      msgs.forEach(function (m) {
        if (m.role === "user") append_user_msg(m.content);
        else append_ai_msg(m.content, m);
      });
      scroll_bottom();
    });
  }

  function rename_session(name) {
    var s = sessions.find(function (x) { return x.name === name; });
    var d = new frappe.ui.Dialog({
      title: __("Rename Conversation"),
      fields: [{ fieldname: "title", fieldtype: "Data", label: __("Title"), reqd: 1, default: s ? s.title : "" }],
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
  function msg_wrapper(max) {
    return '<div style="max-width:' + (max || 850) + 'px;margin:0 auto;width:100%;">';
  }

  function append_user_msg(text) {
    $msgs.append(
      msg_wrapper() +
      '<div style="display:flex;gap:12px;margin-bottom:20px;justify-content:flex-end;">' +
        '<div style="background:var(--primary-color);color:white;border-radius:18px 18px 4px 18px;padding:10px 16px;max-width:75%;font-size:0.9rem;line-height:1.5;word-break:break-word;">' +
          frappe.utils.escape_html(text) +
        '</div>' +
        '<div style="width:32px;height:32px;min-width:32px;border-radius:50%;background:var(--primary-color);color:white;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.8rem;flex-shrink:0;">' + user_init + '</div>' +
      '</div></div>'
    );
  }

  function append_ai_msg(content, meta) {
    var parts = [r_model(meta), r_cost(meta)].filter(Boolean).join(" &middot; ");
    $msgs.append(
      msg_wrapper() +
      '<div style="display:flex;gap:12px;margin-bottom:20px;align-items:flex-start;">' +
        '<div style="width:32px;height:32px;min-width:32px;border-radius:50%;background:var(--control-bg);color:var(--primary-color);display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid var(--dark-border-color);">' + I.sparkles + '</div>' +
        '<div style="flex:1;min-width:0;">' +
          oly_ai.render_markdown(content) +
          '<div style="display:flex;align-items:center;gap:12px;margin-top:6px;font-size:0.75rem;">' +
            '<span class="oly-ai-copy-btn" data-text="' + frappe.utils.escape_html(content) + '" style="cursor:pointer;color:var(--text-muted);display:flex;align-items:center;gap:4px;transition:color .15s;">' + I.copy + ' Copy</span>' +
            (parts ? '<span style="color:var(--text-light);">' + parts + '</span>' : '') +
          '</div>' +
        '</div>' +
      '</div></div>'
    );
    wire_copy();
  }

  function r_model(m) { return m && m.model ? m.model : ""; }
  function r_cost(m) { return m && m.cost ? "$" + Number(m.cost).toFixed(4) : ""; }

  function wire_copy() {
    $msgs.find(".oly-ai-copy-btn").off("click").on("click", function () {
      frappe.utils.copy_to_clipboard($(this).data("text"));
      var $b = $(this);
      $b.html(I.check + " Copied");
      setTimeout(function () { $b.html(I.copy + " Copy"); }, 2000);
    });
  }

  function scroll_bottom() {
    setTimeout(function () { var el = $msgs[0]; if (el) el.scrollTop = el.scrollHeight; }, 60);
  }

  // ── Send ──
  function send_message() {
    var q = $input.val().trim();
    if (!q || sending) return;
    sending = true;
    $input.val("").css("height", "auto");

    var fire = function (sid) {
      $msgs.find(".oly-ai-welcome,.oly-ai-chips-grid").closest('div[style*="justify-content:center"]').remove();
      append_user_msg(q);

      var lid = "fp-ld-" + Date.now();
      $msgs.append(
        msg_wrapper() +
        '<div id="' + lid + '" style="display:flex;gap:12px;margin-bottom:20px;align-items:flex-start;">' +
          '<div style="width:32px;height:32px;min-width:32px;border-radius:50%;background:var(--control-bg);color:var(--primary-color);display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid var(--dark-border-color);">' + I.sparkles + '</div>' +
          '<div style="flex:1;"><div class="oly-ai-typing"><span></span><span></span><span></span></div></div>' +
        '</div></div>'
      );
      scroll_bottom();

      frappe.xcall("oly_ai.api.chat.send_message", { session_name: sid, message: q })
        .then(function (r) {
          $("#" + lid).closest('div[style*="max-width"]').remove();
          append_ai_msg(r.content, r);
          scroll_bottom();
          sending = false;
          $input.focus();
          load_sessions();
        })
        .catch(function (err) {
          $("#" + lid).closest('div[style*="max-width"]').html(
            '<div style="display:flex;gap:12px;margin-bottom:20px;align-items:flex-start;">' +
              '<div style="width:32px;height:32px;min-width:32px;border-radius:50%;background:var(--red-100);color:var(--red-600);display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">!</div>' +
              '<div style="flex:1;color:var(--red-600);font-size:0.9rem;">' + (err.message || __("Something went wrong")) + '</div>' +
            '</div>'
          );
          sending = false;
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
    if (e.which === 13 && !e.shiftKey) { e.preventDefault(); send_message(); }
  });
  $input.on("input", function () {
    this.style.height = "auto";
    this.style.height = Math.min(this.scrollHeight, 150) + "px";
  });
  $("#fp-search").on("input", function () {
    var q = $(this).val().toLowerCase();
    if (!q) { render_sessions(sessions); return; }
    render_sessions(sessions.filter(function (s) { return (s.title || "").toLowerCase().indexOf(q) > -1; }));
  });

  // ── Init ──
  show_welcome();
  load_sessions();
  $input.focus();
};
