/* Ask AI — Full Page ChatGPT-style Experience
 * ALL styles inline. Uses oly_ai.ICON + oly_ai.render_markdown from bundle.
 */
frappe.pages["ask-ai"].on_page_load = function (wrapper) {
  var page = frappe.ui.make_app_page({
    parent: wrapper,
    title: __("Ask AI"),
    single_column: true,
  });

  /* ── Inject scoped CSS ── */
  if (!document.getElementById('oly-fp-styles')) {
    var s = document.createElement('style');
    s.id = 'oly-fp-styles';
    s.textContent = [
      '.oly-fp-sb-item:hover{background:var(--bg-light-gray);}',
      '.oly-fp-sb-item.active{background:var(--primary-color);color:white;}',
      '.oly-fp-sb-item.active .oly-fp-sb-item-title{color:white;}',
      '.oly-fp-sb-item .oly-fp-sb-item-acts{opacity:0;transition:opacity .15s;}',
      '.oly-fp-sb-item:hover .oly-fp-sb-item-acts,.oly-fp-sb-item.active:hover .oly-fp-sb-item-acts{opacity:1;}',
      '.oly-fp-sb-act:hover{color:var(--primary-color);}',
      '.oly-fp-sb-new:hover{background:var(--primary-color) !important;color:white !important;}',
      '.oly-fp-sb-new:hover svg{stroke:white;}',
      '.oly-fp .oly-ai-chip:hover{background:var(--bg-light-gray);border-color:var(--primary-color);}',
      '.oly-fp .oly-ai-send-btn:hover{opacity:0.85;}',
      '.oly-fp .oly-ai-copy-btn:hover{color:var(--primary-color);}',
      '.oly-fp-model-sel{background:var(--control-bg);border:1px solid var(--dark-border-color);color:var(--text-color);font-size:0.75rem;padding:4px 10px;border-radius:20px;outline:none;cursor:pointer;font-family:inherit;-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\'%3E%3Cpath d=\'M0 0l5 6 5-6z\' fill=\'%23888\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center;padding-right:24px;}',
      '.oly-fp-model-sel:hover{border-color:var(--primary-color);}',
      '.oly-fp-attach-btn:hover{color:var(--primary-color);}',
      '.oly-fp-attach-preview{display:flex;flex-wrap:wrap;gap:6px;padding:4px 0;}',
      '.oly-fp-attach-item{display:flex;align-items:center;gap:4px;background:var(--control-bg);border:1px solid var(--dark-border-color);border-radius:8px;padding:4px 8px;font-size:0.75rem;color:var(--text-muted);}',
      '.oly-fp-attach-item img{width:24px;height:24px;border-radius:4px;object-fit:cover;}',
      '.oly-fp-attach-rm{cursor:pointer;color:var(--text-muted);font-weight:700;margin-left:2px;}',
      '.oly-fp-attach-rm:hover{color:var(--red-600);}',
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
      '.fp-sidebar-closed .oly-fp-sidebar{display:none !important;}',
    ].join('\n');
    document.head.appendChild(s);
  }

  // Hide Frappe page-head and fix container to avoid navbar overlap
  $(wrapper).find(".page-head").hide();
  // Hide all default Frappe page wrappers that add padding/scroll
  $(wrapper).closest(".main-section").css({"margin": "0", "padding": "0"});
  $(wrapper).closest(".container-fluid").css({"padding": "0"});
  $(".page-body").css({"margin-top": "0"});
  // Hide the Frappe sidebar (module sidebar) if visible
  $(wrapper).find(".layout-side-section").hide();

  // Set navbar breadcrumb like other pages (shows "Ask AI" next to logo)
  frappe.breadcrumbs.add({
    type: "Custom",
    label: __("Ask AI"),
    route: "/app/ask-ai",
  });

  // ── User info ──
  var user_info = frappe.user_info(frappe.session.user);
  var user_image = user_info.image;
  var user_fullname = user_info.fullname || frappe.session.user;
  var user_avatar_html = user_image
    ? '<img src="' + user_image + '" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;" />'
    : '<div style="width:32px;height:32px;border-radius:50%;background:var(--primary-color);color:white;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.8rem;flex-shrink:0;">' + user_info.abbr + '</div>';
  var user_avatar_sm = user_image
    ? '<img src="' + user_image + '" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;" />'
    : '<div style="width:28px;height:28px;border-radius:50%;background:var(--primary-color);color:white;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:0.7rem;flex-shrink:0;">' + user_info.abbr + '</div>';

  // ── Models ──
  var available_models = [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', group: 'Fast' },
    { value: 'gpt-4o', label: 'GPT-4o', group: 'Advanced' },
    { value: 'gpt-4.1', label: 'GPT-4.1', group: 'Advanced' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', group: 'Fast' },
    { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', group: 'Fast' },
    { value: 'o4-mini', label: 'o4-mini (Reasoning)', group: 'Reasoning' },
  ];
  var current_model = 'gpt-4o-mini';

  // State
  var current_session = null;
  var sessions = [];
  var sending = false;
  var sidebar_open = true;
  var attached_files = []; // [{name, file_url, is_image, preview}]

  var I = oly_ai.ICON;

  var suggestions = [
    __("How do I create a Sales Order?"),
    __("What is our leave policy?"),
    __("Explain the purchase workflow"),
    __("How to submit a timesheet?"),
  ];

  // ── Model selector HTML ──
  var model_options = available_models.map(function (m) {
    var sel = m.value === current_model ? ' selected' : '';
    return '<option value="' + m.value + '"' + sel + '>' + m.label + '</option>';
  }).join('');

  // ── Paperclip icon ──
  var clip_icon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>';

  // ── Build Layout ──
  // Use position:fixed so the AI page sits exactly below the navbar, no overlap.
  // Align with the navbar container so edges match the logo and profile pic.
  var navbar_h = ($(".navbar").outerHeight() || 56);
  var navbar_container = document.querySelector("header.navbar > .container");
  var fp_left = '0';
  var fp_right = '0';
  if (navbar_container) {
    var rect = navbar_container.getBoundingClientRect();
    fp_left = Math.max(0, Math.floor(rect.left)) + 'px';
    fp_right = Math.max(0, Math.floor(window.innerWidth - rect.right)) + 'px';
  }
  page.main.html(
    '<div class="oly-fp" id="oly-fp" style="position:fixed;top:' + navbar_h + 'px;left:' + fp_left + ';right:' + fp_right + ';bottom:0;display:flex;overflow:hidden;font-family:var(--font-stack);color:var(--text-color);background:var(--bg-color);z-index:100;border-radius:' + (is_full_width ? '0' : '0 0 0 0') + ';">' +

    /* Sidebar */
    '<div class="oly-fp-sidebar" id="oly-fp-sidebar" style="width:260px;min-width:260px;background:var(--card-bg);border-right:1px solid var(--dark-border-color);display:flex;flex-direction:column;overflow:hidden;">' +
      '<div style="padding:14px 12px 8px;">' +
        '<button class="oly-fp-sb-new" id="fp-new" style="width:100%;display:flex;align-items:center;gap:8px;padding:10px 14px;border:1px solid var(--dark-border-color);border-radius:8px;background:transparent;color:var(--text-color);cursor:pointer;font-size:0.875rem;font-weight:500;">' +
          I.plus + '<span>' + __("New chat") + '</span>' +
        '</button>' +
      '</div>' +
      '<div style="padding:0 12px 8px;">' +
        '<input type="text" id="fp-search" placeholder="' + __("Search...") + '" style="width:100%;padding:8px 12px;border:1px solid var(--dark-border-color);border-radius:8px;background:var(--control-bg);color:var(--text-color);font-size:0.8125rem;outline:none;font-family:inherit;" />' +
      '</div>' +
      '<div id="fp-list" style="flex:1;overflow-y:auto;padding:0 8px;"></div>' +
      '<div style="padding:12px;border-top:1px solid var(--dark-border-color);">' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
          user_avatar_html +
          '<span style="font-size:0.8125rem;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + user_fullname + '</span>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* Main */
    '<div class="oly-fp-main" style="flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;">' +
      /* Top bar */
      '<div style="display:flex;align-items:center;padding:10px 16px;border-bottom:1px solid var(--dark-border-color);flex-shrink:0;gap:12px;">' +
        '<button id="fp-toggle" title="' + __("Toggle sidebar") + '" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:4px;display:flex;">' + I.menu + '</button>' +
        '<span id="fp-title" style="font-weight:600;font-size:1rem;color:var(--heading-color);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + __("New Chat") + '</span>' +
        '<select class="oly-fp-model-sel" id="fp-model">' + model_options + '</select>' +
      '</div>' +
      /* Messages */
      '<div id="fp-msgs" style="flex:1;overflow-y:auto;padding:24px 16px;"></div>' +
      /* Input area */
      '<div style="padding:0 16px 12px;flex-shrink:0;">' +
        '<div id="fp-attach-preview" class="oly-fp-attach-preview" style="max-width:850px;margin:0 auto;"></div>' +
        '<div style="max-width:850px;margin:0 auto;display:flex;align-items:flex-end;gap:8px;border:1px solid var(--dark-border-color);border-radius:16px;padding:8px 12px;background:var(--control-bg);">' +
          '<span class="oly-fp-attach-btn" id="fp-attach" style="cursor:pointer;color:var(--text-muted);display:flex;align-items:center;padding:4px;flex-shrink:0;" title="' + __("Attach file or image") + '">' + clip_icon + '</span>' +
          '<input type="file" id="fp-file-input" multiple accept="image/*,.pdf,.txt,.csv,.xlsx,.xls,.doc,.docx,.json,.xml,.md" style="display:none;" />' +
          '<textarea id="fp-input" rows="1" placeholder="' + __("Message AI...") + '" maxlength="4000" style="flex:1;border:none;background:transparent;color:var(--text-color);font-size:0.9rem;resize:none;min-height:24px;max-height:150px;line-height:1.5;outline:none;font-family:inherit;padding:4px 0;"></textarea>' +
          '<span class="oly-ai-send-btn" id="fp-send" style="cursor:pointer;height:32px;width:32px;min-width:32px;border-radius:50%;background:var(--primary-color);display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + I.send + '</span>' +
        '</div>' +
        '<p style="text-align:center;font-size:0.7rem;color:var(--text-muted);margin:6px 0 0;">' + __("AI can make mistakes. Verify important information.") + '</p>' +
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
  var $model = $("#fp-model");
  var $attach_preview = $("#fp-attach-preview");

  // ── Welcome ──
  function show_welcome() {
    $msgs.html(
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:20px;">' +
        '<div style="color:var(--primary-color);margin-bottom:12px;">' + I.sparkles_lg + '</div>' +
        '<h3 style="font-size:1.5rem;font-weight:600;color:var(--heading-color);margin-bottom:20px;">' + __("How can I help you today?") + '</h3>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:520px;width:100%;">' +
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
    clear_attachments();
    $list.find(".oly-fp-sb-item").removeClass("active");
    $input.val("").css("height", "auto").focus();
  }

  function open_session(name) {
    current_session = name;
    clear_attachments();
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

  // ── File Attachments ──
  function clear_attachments() {
    attached_files = [];
    $attach_preview.html('');
  }

  function render_attachments() {
    if (!attached_files.length) { $attach_preview.html(''); return; }
    var html = attached_files.map(function (f, i) {
      var preview = f.is_image
        ? '<img src="' + f.file_url + '" />'
        : '<span style="font-size:1rem;">📄</span>';
      return '<div class="oly-fp-attach-item">' + preview +
        '<span>' + frappe.utils.escape_html(f.name.length > 20 ? f.name.substring(0, 18) + '...' : f.name) + '</span>' +
        '<span class="oly-fp-attach-rm" data-idx="' + i + '">&times;</span></div>';
    }).join('');
    $attach_preview.html(html);
    $attach_preview.find('.oly-fp-attach-rm').on('click', function () {
      attached_files.splice($(this).data('idx'), 1);
      render_attachments();
    });
  }

  function upload_file(file) {
    return new Promise(function (resolve, reject) {
      var fd = new FormData();
      fd.append('file', file, file.name);
      fd.append('is_private', '0');
      fd.append('folder', 'Home');
      fd.append('doctype', 'AI Chat Session');

      $.ajax({
        type: 'POST',
        url: '/api/method/upload_file',
        data: fd,
        processData: false,
        contentType: false,
        headers: { 'X-Frappe-CSRF-Token': frappe.csrf_token },
        success: function (r) {
          var msg = r.message;
          resolve({
            name: file.name,
            file_url: msg.file_url,
            is_image: /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file.name),
            preview: msg.file_url,
          });
        },
        error: function (err) { reject(err); },
      });
    });
  }

  // ── Messages ──
  function w(max) { return '<div style="max-width:' + (max || 850) + 'px;margin:0 auto;width:100%;">'; }

  function append_user_msg(text) {
    $msgs.append(
      w() +
      '<div style="display:flex;gap:12px;margin-bottom:20px;justify-content:flex-end;">' +
        '<div style="max-width:75%;">' +
          '<div style="background:var(--primary-color);color:white;border-radius:18px 18px 4px 18px;padding:10px 16px;font-size:0.9rem;line-height:1.5;word-break:break-word;">' +
            frappe.utils.escape_html(text) +
          '</div>' +
        '</div>' +
        user_avatar_sm +
      '</div></div>'
    );
  }

  function append_ai_msg(content, meta) {
    var parts = [r_model(meta), r_cost(meta)].filter(Boolean).join(" &middot; ");
    $msgs.append(
      w() +
      '<div style="display:flex;gap:12px;margin-bottom:20px;align-items:flex-start;">' +
        '<div style="width:28px;height:28px;min-width:28px;border-radius:50%;background:var(--control-bg);color:var(--primary-color);display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid var(--dark-border-color);">' + I.sparkles + '</div>' +
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

    var files_to_send = attached_files.slice();
    clear_attachments();
    var sel_model = $model.val();

    var fire = function (sid) {
      $msgs.find('[style*="justify-content:center"]').closest('div[style*="max-width"]').parent().find('[style*="justify-content:center"]').closest('div[style*="height:100%"]').remove();
      // Simpler: just remove welcome
      $msgs.children().filter(function () { return $(this).find('.oly-ai-chip').length > 0 || $(this).find('h3').length > 0; }).remove();

      append_user_msg(q);

      // Show attached files in message
      if (files_to_send.length) {
        var imgs = files_to_send.filter(function (f) { return f.is_image; });
        if (imgs.length) {
          var img_html = imgs.map(function (f) {
            return '<img src="' + f.file_url + '" style="max-width:200px;max-height:150px;border-radius:8px;border:1px solid var(--dark-border-color);" />';
          }).join(' ');
          $msgs.append(w() + '<div style="display:flex;justify-content:flex-end;margin-bottom:12px;gap:8px;flex-wrap:wrap;">' + img_html + '</div></div>');
        }
      }

      var lid = "fp-ld-" + Date.now();
      $msgs.append(
        w() +
        '<div id="' + lid + '" style="display:flex;gap:12px;margin-bottom:20px;align-items:flex-start;">' +
          '<div style="width:28px;height:28px;min-width:28px;border-radius:50%;background:var(--control-bg);color:var(--primary-color);display:flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid var(--dark-border-color);">' + I.sparkles + '</div>' +
          '<div style="flex:1;"><div class="oly-ai-typing"><span></span><span></span><span></span></div></div>' +
        '</div></div>'
      );
      scroll_bottom();

      var file_urls = files_to_send.map(function (f) { return f.file_url; });

      frappe.xcall("oly_ai.api.chat.send_message", {
        session_name: sid,
        message: q,
        model: sel_model,
        file_urls: file_urls.length ? JSON.stringify(file_urls) : null,
      })
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
              '<div style="width:28px;height:28px;min-width:28px;border-radius:50%;background:var(--red-100);color:var(--red-600);display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">!</div>' +
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
  // Attach button
  $("#fp-attach").on("click", function () { $("#fp-file-input").trigger("click"); });
  $("#fp-file-input").on("change", function () {
    var files = this.files;
    if (!files || !files.length) return;
    var promises = [];
    for (var i = 0; i < files.length; i++) {
      promises.push(upload_file(files[i]));
    }
    Promise.all(promises).then(function (uploaded) {
      attached_files = attached_files.concat(uploaded);
      render_attachments();
    }).catch(function () {
      frappe.show_alert({ message: __("Failed to upload file"), indicator: "red" });
    });
    // Reset so same file can be re-selected
    $("#fp-file-input").val("");
  });
  // Model selector
  $model.on("change", function () {
    current_model = $(this).val();
  });

  // Respond to Toggle Full Width in real-time — re-align with navbar container
  function align_with_navbar() {
    var nc = document.querySelector("header.navbar > .container");
    if (nc) {
      var r = nc.getBoundingClientRect();
      $fp.css({
        left: Math.max(0, Math.floor(r.left)) + 'px',
        right: Math.max(0, Math.floor(window.innerWidth - r.right)) + 'px',
      });
    }
  }
  $(document.body).on("toggleFullWidth", function () {
    // Small delay so Frappe's container class change takes effect first
    setTimeout(align_with_navbar, 50);
  });
  $(window).on("resize", align_with_navbar);

  // ── Init ──
  show_welcome();
  load_sessions();
  $input.focus();
};
