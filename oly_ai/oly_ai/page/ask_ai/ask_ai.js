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
      /* mode selector */
      '.oly-fp-mode-sel{display:flex;border:1px solid var(--border-color);border-radius:20px;overflow:hidden;background:var(--control-bg);}',
      '.oly-fp-mode{padding:5px 14px;font-size:0.75rem;border:none;background:transparent;color:var(--text-muted);cursor:pointer;font-family:inherit;font-weight:500;transition:all .15s;white-space:nowrap;}',
      '.oly-fp-mode:hover{color:var(--text-color);}',
      '.oly-fp-mode.active{background:var(--primary-color);color:white;border-radius:20px;}',
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
      '.ai-md img{max-width:100%;max-height:512px;border-radius:12px;border:1px solid var(--border-color);cursor:pointer;margin:8px 0;}',
      '.ai-md blockquote{border-left:3px solid var(--primary-color);margin:0.6em 0;padding:4px 12px;color:var(--text-muted);background:var(--control-bg);border-radius:0 6px 6px 0;}',
      '.ai-md h2,.ai-md h3,.ai-md h4{margin:0.8em 0 0.4em;color:var(--heading-color);}',
      '.fp-sidebar-closed .oly-fp-sidebar{display:none !important;}',
      /* Dark mode overrides — only applied when [data-theme="dark"] */
      '[data-theme="dark"] .oly-fp-ai-avatar{background:#e8e8e8 !important;color:#1a1a1a !important;}',
      '[data-theme="dark"] .oly-fp .oly-ai-send-btn{background:white !important;}',
      '[data-theme="dark"] .oly-fp .oly-ai-send-btn svg{fill:#1a1a1a !important;}',
      '[data-theme="dark"] .oly-fp-input-bar{border-color:var(--gray-600) !important;}',
      '[data-theme="dark"] .oly-fp-mode.active{background:white !important;color:#1a1a1a !important;}',
      '[data-theme="dark"] .oly-fp-sb-item.active{background:var(--gray-700) !important;}',
      '[data-theme="dark"] .oly-fp-sb-new:hover{background:var(--gray-700) !important;color:white !important;}',
      '[data-theme="dark"] .oly-fp-user-bubble{background:var(--gray-700) !important;}',
      /* approval cards */
      '.oly-action-card{background:var(--control-bg);border:1px solid var(--dark-border-color);border-radius:12px;padding:14px 16px;margin:8px 0;}',
      '.oly-action-card .oly-action-header{display:flex;align-items:center;gap:8px;margin-bottom:8px;}',
      '.oly-action-card .oly-action-badge{font-size:0.7rem;font-weight:600;padding:2px 8px;border-radius:10px;text-transform:uppercase;}',
      '.oly-action-badge.pending{background:var(--yellow-100);color:var(--yellow-700);}',
      '.oly-action-badge.executed{background:var(--green-100);color:var(--green-700);}',
      '.oly-action-badge.rejected{background:var(--red-100);color:var(--red-600);}',
      '.oly-action-badge.failed{background:var(--red-100);color:var(--red-600);}',
      '.oly-action-card .oly-action-detail{font-size:0.85rem;color:var(--text-color);margin:4px 0;}',
      '.oly-action-card .oly-action-fields{font-size:0.8rem;color:var(--text-muted);background:var(--bg-color);border-radius:8px;padding:8px 12px;margin:8px 0;font-family:monospace;max-height:150px;overflow-y:auto;}',
      '.oly-action-card .oly-action-btns{display:flex;gap:8px;margin-top:10px;}',
      '.oly-action-card .btn-approve{background:var(--green-500);color:white;border:none;padding:6px 16px;border-radius:8px;font-size:0.8rem;font-weight:600;cursor:pointer;}',
      '.oly-action-card .btn-approve:hover{background:var(--green-600);}',
      '.oly-action-card .btn-reject{background:transparent;color:var(--red-500);border:1px solid var(--red-300);padding:6px 16px;border-radius:8px;font-size:0.8rem;font-weight:600;cursor:pointer;}',
      '.oly-action-card .btn-reject:hover{background:var(--red-50);}',
      '[data-theme="dark"] .oly-action-card{background:var(--gray-800);border-color:var(--gray-600);}',
      '[data-theme="dark"] .oly-action-card .oly-action-fields{background:var(--gray-900);}',
      /* code block enhancements */
      '.ai-md pre{position:relative;}',
      '.ai-code-copy{position:absolute;top:6px;right:6px;background:var(--control-bg);border:1px solid var(--dark-border-color);border-radius:6px;padding:3px 8px;font-size:0.7rem;color:var(--text-muted);cursor:pointer;opacity:0;transition:opacity .15s;display:flex;align-items:center;gap:4px;}',
      '.ai-md pre:hover .ai-code-copy{opacity:1;}',
      '.ai-code-copy:hover{color:var(--primary-color);border-color:var(--primary-color);}',
      '.ai-code-lang{position:absolute;top:6px;left:10px;font-size:0.65rem;color:var(--text-light);text-transform:uppercase;letter-spacing:0.5px;}',
      /* stop button */
      '.oly-fp-stop-btn{cursor:pointer;height:32px;width:32px;min-width:32px;border-radius:50%;background:var(--red-500);color:white;display:flex;align-items:center;justify-content:center;flex-shrink:0;animation:oly-pulse 1.5s ease-in-out infinite;border:none;padding:0;}',
      '.oly-fp-stop-btn:hover{background:var(--red-600);}',
      '@keyframes oly-pulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.4);}50%{box-shadow:0 0 0 6px rgba(239,68,68,0);}}',
      /* streaming cursor */
      '.ai-streaming-cursor::after{content:"▊";animation:ai-blink 1s infinite;color:var(--primary-color);}',
      '@keyframes ai-blink{0%,100%{opacity:1;}50%{opacity:0;}}',
      /* export button */
      '.oly-fp-export{background:none;border:none;color:var(--text-muted);cursor:pointer;padding:4px 8px;border-radius:6px;font-size:0.75rem;display:flex;align-items:center;gap:4px;transition:all .15s;}',
      '.oly-fp-export:hover{color:var(--primary-color);background:var(--control-bg);}',
      /* tool call indicator */
      '.ai-tool-indicator{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--control-bg);border:1px solid var(--dark-border-color);border-radius:8px;font-size:0.8rem;color:var(--text-muted);margin:4px 0;animation:oly-msg-in 0.2s ease;}',
      '.ai-tool-indicator svg{animation:ai-spin 1s linear infinite;width:14px;height:14px;}',
      '@keyframes ai-spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}',
      /* drag & drop overlay */
      '.oly-fp-drop-overlay{position:absolute;inset:0;background:rgba(var(--primary-color-rgb,59,130,246),0.08);border:2px dashed var(--primary-color);border-radius:12px;z-index:50;display:flex;align-items:center;justify-content:center;pointer-events:none;animation:oly-msg-in 0.15s ease;}',
      '.oly-fp-drop-overlay span{background:var(--card-bg);padding:12px 24px;border-radius:12px;font-size:0.95rem;font-weight:600;color:var(--primary-color);box-shadow:0 4px 12px rgba(0,0,0,0.1);display:flex;align-items:center;gap:8px;}',
      '.oly-fp-drop-overlay svg{width:20px;height:20px;stroke:var(--primary-color);}',
      '.oly-fp-input-bar.drag-over{border-color:var(--primary-color) !important;background:rgba(var(--primary-color-rgb,59,130,246),0.04) !important;}',
      /* uploading indicator */
      '.oly-fp-uploading{display:flex;align-items:center;gap:6px;padding:6px 12px;font-size:0.8rem;color:var(--text-muted);}',
      '.oly-fp-uploading .spinner{width:14px;height:14px;border:2px solid var(--dark-border-color);border-top-color:var(--primary-color);border-radius:50%;animation:ai-spin 0.6s linear infinite;}',
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
    { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', group: 'Fast' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', group: 'Fast' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', group: 'Fast' },
    { value: 'gpt-4.1', label: 'GPT-4.1', group: 'Advanced' },
    { value: 'gpt-4o', label: 'GPT-4o', group: 'Advanced' },
    { value: 'gpt-5', label: 'GPT-5', group: 'Advanced' },
    { value: 'gpt-5.2', label: 'GPT-5.2', group: 'Advanced' },
    { value: 'gpt-5-chat-latest', label: 'GPT-5 Chat (Latest)', group: 'Advanced' },
    { value: 'gpt-5.2-chat-latest', label: 'GPT-5.2 Chat (Latest)', group: 'Advanced' },
    { value: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet', group: 'Anthropic' },
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', group: 'Anthropic' },
    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', group: 'Anthropic' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus', group: 'Anthropic' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', group: 'Other APIs' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', group: 'Other APIs' },
    { value: 'deepseek-chat', label: 'DeepSeek Chat', group: 'Other APIs' },
    { value: 'grok-2-latest', label: 'Grok 2', group: 'Other APIs' },
    { value: 'llama-3.3-70b-instruct', label: 'Llama 3.3 70B Instruct', group: 'Other APIs' },
    { value: 'o4-mini', label: 'o4-mini', group: 'Reasoning' },
    { value: 'o3-mini', label: 'o3-mini', group: 'Reasoning' },
    { value: 'o3', label: 'o3', group: 'Reasoning' },
    { value: 'o1-mini', label: 'o1-mini', group: 'Reasoning' },
    { value: 'o1', label: 'o1', group: 'Reasoning' },
  ];
  var current_model = 'gpt-4o-mini';
  var current_mode = 'ask'; // ask | agent | execute

  // State
  var current_session = null;
  var sessions = [];
  var sending = false;
  var sidebar_open = true;
  var attached_files = []; // [{name, file_url, is_image, preview}]
  var user_access = null; // loaded async — {tier, allowed_modes, can_query_data, can_execute_actions}

  var I = oly_ai.ICON;

  var suggestions = [
    __("How do I create a Sales Order?"),
    __("What is our leave policy?"),
    __("Explain the purchase workflow"),
    __("How to submit a timesheet?"),
  ];

  // Image intent detection (match backend logic enough for routing)
  var IMAGE_REQUEST_RE = /(generate|create|make|draw|design|render).*(image|picture|photo|illustration|artwork|logo|banner|poster|graphic|visual)|\bdall[\s\-]?e\b/i;
  function is_image_request(text) {
    return IMAGE_REQUEST_RE.test((text || '').trim());
  }

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
    '<div class="oly-fp" id="oly-fp" style="position:fixed;top:' + navbar_h + 'px;left:' + fp_left + ';right:' + fp_right + ';bottom:0;display:flex;overflow:hidden;font-family:var(--font-stack);color:var(--text-color);background:var(--bg-color);z-index:100;">' +

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
        '<span id="fp-title" style="font-weight:600;font-size:1rem;color:var(--heading-color);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + __("New Chat") + '</span>' +
        '<div style="flex:1;"></div>' +
        '<div class="oly-fp-mode-sel" id="fp-mode-sel">' +
          '<button class="oly-fp-mode active" data-mode="ask">' + __("Ask") + '</button>' +
          '<button class="oly-fp-mode" data-mode="research">' + __("Research") + '</button>' +
          '<button class="oly-fp-mode" data-mode="agent">' + __("Agent") + '</button>' +
          '<button class="oly-fp-mode" data-mode="execute">' + __("Execute") + '</button>' +
        '</div>' +
        '<select class="oly-fp-model-sel" id="fp-model">' + model_options + '</select>' +
        '<button class="oly-fp-export" id="fp-export" title="' + __("Export chat") + '"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' + __("Export") + '</button>' +
      '</div>' +
      /* Messages */
      '<div id="fp-msgs" style="flex:1;overflow-y:auto;padding:24px 16px;"></div>' +
      /* Input area */
      '<div style="padding:0 16px 12px;flex-shrink:0;">' +
        '<div id="fp-attach-preview" class="oly-fp-attach-preview" style="max-width:850px;margin:0 auto;"></div>' +
        '<div class="oly-fp-input-bar" style="max-width:850px;margin:0 auto;display:flex;align-items:flex-end;gap:8px;border:1px solid var(--dark-border-color);border-radius:16px;padding:8px 12px;background:var(--control-bg);">' +
          '<span class="oly-fp-attach-btn" id="fp-attach" style="cursor:pointer;color:var(--text-muted);display:flex;align-items:center;padding:4px;flex-shrink:0;" title="' + __("Attach file or image") + '">' + clip_icon + '</span>' +
          '<input type="file" id="fp-file-input" multiple accept="image/*,.pdf,.txt,.csv,.xlsx,.xls,.doc,.docx,.json,.xml,.md,.ppt,.pptx" style="display:none;" />' +
          '<textarea id="fp-input" rows="1" placeholder="' + __("Message AI...") + '" maxlength="4000" style="flex:1;border:none;background:transparent;color:var(--text-color);font-size:0.9rem;resize:none;min-height:24px;max-height:150px;line-height:1.5;outline:none;font-family:inherit;padding:4px 0;"></textarea>' +
          '<span class="oly-ai-send-btn" id="fp-send" style="cursor:pointer;height:32px;width:32px;min-width:32px;border-radius:50%;background:var(--primary-color);color:white;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + I.send + '</span>' +
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

  function render_model_selector_options(models, default_model) {
    if (!models || !models.length) return;
    var active = current_model;
    if (default_model && !models.some(function (m) { return m.value === active; })) {
      active = default_model;
      current_model = active;
    }
    var opts = models.map(function (m) {
      var sel = m.value === active ? ' selected' : '';
      return '<option value="' + m.value + '"' + sel + '>' + (m.label || m.value) + '</option>';
    }).join('');
    $model.html(opts).val(active);
  }

  function load_model_catalog() {
    frappe.xcall("oly_ai.api.chat.get_model_catalog")
      .then(function (res) {
        if (!res || !res.models) return;
        available_models = res.models;
        if (res.default_model) current_model = res.default_model;
        render_model_selector_options(available_models, res.default_model);
      })
      .catch(function () {
        render_model_selector_options(available_models, current_model);
      });
  }

  render_model_selector_options(available_models, current_model);
  load_model_catalog();

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
      fd.append('folder', 'Home/Attachments');

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
          '<div class="oly-fp-user-bubble" style="background:var(--primary-color);color:white;border-radius:18px 18px 4px 18px;padding:10px 16px;font-size:0.9rem;line-height:1.5;word-break:break-word;">' +
            frappe.utils.escape_html(text) +
          '</div>' +
        '</div>' +
        user_avatar_sm +
      '</div></div>'
    );
  }

  function append_ai_msg(content, meta) {
    var parts = [r_model(meta), r_cost(meta)].filter(Boolean).join(" &middot; ");
    var is_image = meta && meta.type === "image";
    var rendered;
    if (is_image && meta.image_url) {
      // Render image directly with nice styling
      rendered = '<div style="margin:8px 0;">' +
        '<img src="' + meta.image_url + '" style="max-width:100%;max-height:512px;border-radius:12px;border:1px solid var(--border-color);cursor:pointer;" onclick="window.open(this.src,\'_blank\')" />' +
        '</div>' +
        (meta.revised_prompt ? '<p style="font-size:0.8rem;color:var(--text-muted);font-style:italic;margin:4px 0 0;">' + frappe.utils.escape_html(meta.revised_prompt) + '</p>' : '');
    } else {
      rendered = oly_ai.render_markdown(content);
    }
    $msgs.append(
      w() +
      '<div style="display:flex;gap:12px;margin-bottom:20px;align-items:flex-start;">' +
        '<div class="oly-fp-ai-avatar" style="width:28px;height:28px;min-width:28px;border-radius:50%;background:var(--primary-color);color:white;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + I.sparkles + '</div>' +
        '<div style="flex:1;min-width:0;">' +
          rendered +
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
    enhance_code_blocks();
  }

  function scroll_bottom() {
    setTimeout(function () { var el = $msgs[0]; if (el) el.scrollTop = el.scrollHeight; }, 60);
  }

  // ── Approval Action Cards ──
  function render_action_cards(actions) {
    if (!actions || !actions.length) return;
    actions.forEach(function (action) {
      var fields_html = '';
      if (action.fields) {
        var entries = Object.entries(action.fields);
        if (entries.length) {
          fields_html = '<div class="oly-action-fields">';
          entries.forEach(function (pair) {
            fields_html += '<div><strong>' + frappe.utils.escape_html(pair[0]) + ':</strong> ' + frappe.utils.escape_html(String(pair[1])) + '</div>';
          });
          fields_html += '</div>';
        }
      }

      var dangerous = ['Submit Document', 'Cancel Document', 'Delete Document'];
      var warning_html = '';
      if (dangerous.indexOf(action.action_type) > -1) {
        warning_html = '<div style="color:var(--red-500);font-size:0.8rem;margin:6px 0;font-weight:500;">' +
          '⚠️ ' + __("This is a potentially irreversible action. Please review carefully.") + '</div>';
      }

      var card_id = 'action-' + action.action_id;
      var card_html = w() +
        '<div class="oly-action-card" id="' + card_id + '">' +
          '<div class="oly-action-header">' +
            '<span class="oly-action-badge pending">' + __("Pending Approval") + '</span>' +
            '<span style="font-size:0.75rem;color:var(--text-muted);">' + frappe.utils.escape_html(action.action_type) + '</span>' +
          '</div>' +
          '<div class="oly-action-detail">' + frappe.utils.escape_html(action.summary || action.message) + '</div>' +
          (action.target_doctype ? '<div style="font-size:0.8rem;color:var(--text-muted);">DocType: <strong>' + frappe.utils.escape_html(action.target_doctype) + '</strong>' +
            (action.target_name ? ' / ' + frappe.utils.escape_html(action.target_name) : '') + '</div>' : '') +
          fields_html +
          warning_html +
          '<div class="oly-action-btns">' +
            '<button class="btn-approve" data-action="' + action.action_id + '">' + __("✓ Approve & Execute") + '</button>' +
            '<button class="btn-reject" data-action="' + action.action_id + '">' + __("✕ Reject") + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
      $msgs.append(card_html);
    });

    // Wire up buttons
    $msgs.find('.btn-approve').off('click').on('click', function () {
      var action_id = $(this).data('action');
      var $card = $('#action-' + action_id);
      var $btns = $card.find('.oly-action-btns');
      $btns.html('<span style="color:var(--text-muted);font-size:0.8rem;"><i class="fa fa-spinner fa-spin"></i> ' + __("Executing...") + '</span>');

      frappe.xcall('oly_ai.api.actions.approve_action', { action_name: action_id })
        .then(function (r) {
          $card.find('.oly-action-badge').removeClass('pending').addClass('executed').text(__("Executed"));
          $btns.html('<span style="color:var(--green-600);font-size:0.8rem;font-weight:600;">✓ ' + frappe.utils.escape_html(r.message || __("Action executed successfully")) + '</span>');
        })
        .catch(function (err) {
          $card.find('.oly-action-badge').removeClass('pending').addClass('failed').text(__("Failed"));
          $btns.html('<span style="color:var(--red-500);font-size:0.8rem;">✕ ' + frappe.utils.escape_html(err.message || __("Execution failed")) + '</span>');
        });
    });

    $msgs.find('.btn-reject').off('click').on('click', function () {
      var action_id = $(this).data('action');
      var $card = $('#action-' + action_id);
      frappe.xcall('oly_ai.api.actions.reject_action', { action_name: action_id })
        .then(function () {
          $card.find('.oly-action-badge').removeClass('pending').addClass('rejected').text(__("Rejected"));
          $card.find('.oly-action-btns').html('<span style="color:var(--text-muted);font-size:0.8rem;">' + __("Action rejected") + '</span>');
        });
    });

    scroll_bottom();
  }

  // ── Load user access level ──
  function load_user_access() {
    frappe.xcall('oly_ai.core.access_control.get_user_access').then(function (access) {
      user_access = access;
      // Hide modes the user doesn't have access to
      if (access && access.allowed_modes) {
        $('.oly-fp-mode').each(function () {
          var mode = $(this).data('mode');
          if (access.allowed_modes.indexOf(mode) === -1) {
            $(this).hide();
          }
        });
      }
    }).catch(function () {
      // If access control check fails, show all modes
      user_access = null;
    });
  }

  // ── Send (with streaming support) ──
  var stream_task_id = null;

  function send_message() {
    var q = $input.val().trim();
    if (!q || sending) return;
    set_sending_state(true);
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
          '<div class="oly-fp-ai-avatar" style="width:28px;height:28px;min-width:28px;border-radius:50%;background:var(--primary-color);color:white;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + I.sparkles + '</div>' +
          '<div style="flex:1;"><div class="oly-ai-typing"><span></span><span></span><span></span></div></div>' +
        '</div></div>'
      );
      scroll_bottom();

      var file_urls = files_to_send.map(function (f) { return f.file_url; });

      // Image generation uses non-streaming path (backend auto-routes to DALL·E)
      if (is_image_request(q) && !file_urls.length) {
        frappe.xcall("oly_ai.api.chat.send_message", {
          session_name: sid,
          message: q,
          model: sel_model,
          mode: current_mode,
          file_urls: null,
        })
          .then(function (r) {
            $("#" + lid).closest('div[style*="max-width"]').remove();
            append_ai_msg(r.content, r);
            if (r.pending_actions && r.pending_actions.length) {
              render_action_cards(r.pending_actions);
            }
            scroll_bottom();
            set_sending_state(false);
            load_sessions();
          })
          .catch(function (err) {
            $("#" + lid).closest('div[style*="max-width"]').html(
              '<div style="display:flex;gap:12px;margin-bottom:20px;align-items:flex-start;">' +
                '<div style="width:28px;height:28px;min-width:28px;border-radius:50%;background:var(--red-100);color:var(--red-600);display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">!</div>' +
                '<div style="flex:1;color:var(--red-600);font-size:0.9rem;">' + (err.message || __("Image generation failed")) + '</div>' +
              '</div>'
            );
            set_sending_state(false);
          });
        return;
      }

      // Try streaming first, fall back to sync
      frappe.xcall("oly_ai.api.stream.send_message_stream", {
        session_name: sid,
        message: q,
        model: sel_model,
        mode: current_mode,
        file_urls: file_urls.length ? JSON.stringify(file_urls) : null,
      })
        .then(function (r) {
          stream_task_id = r.task_id;
          // Replace typing indicator with empty streaming container
          $("#" + lid).closest('div[style*="max-width"]').html(
            '<div style="display:flex;gap:12px;margin-bottom:20px;align-items:flex-start;">' +
              '<div class="oly-fp-ai-avatar" style="width:28px;height:28px;min-width:28px;border-radius:50%;background:var(--primary-color);color:white;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + I.sparkles + '</div>' +
              '<div id="stream-content-' + r.task_id + '" class="ai-streaming-cursor" style="flex:1;min-width:0;"></div>' +
            '</div>'
          );
          scroll_bottom();
        })
        .catch(function () {
          // Fallback to non-streaming API
          frappe.xcall("oly_ai.api.chat.send_message", {
            session_name: sid,
            message: q,
            model: sel_model,
            mode: current_mode,
            file_urls: file_urls.length ? JSON.stringify(file_urls) : null,
          })
            .then(function (r) {
              $("#" + lid).closest('div[style*="max-width"]').remove();
              append_ai_msg(r.content, r);
              if (r.pending_actions && r.pending_actions.length) {
                render_action_cards(r.pending_actions);
              }
              scroll_bottom();
              set_sending_state(false);
              load_sessions();
            })
            .catch(function (err) {
              $("#" + lid).closest('div[style*="max-width"]').html(
                '<div style="display:flex;gap:12px;margin-bottom:20px;align-items:flex-start;">' +
                  '<div style="width:28px;height:28px;min-width:28px;border-radius:50%;background:var(--red-100);color:var(--red-600);display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">!</div>' +
                  '<div style="flex:1;color:var(--red-600);font-size:0.9rem;">' + (err.message || __("Something went wrong")) + '</div>' +
                '</div>'
              );
              set_sending_state(false);
            });
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

  // ── Realtime event listeners for streaming ──
  var stream_buffer = {};

  frappe.realtime.on("ai_chunk", function (data) {
    if (!data || !data.task_id) return;
    var $el = $("#stream-content-" + data.task_id);
    if (!$el.length) return;
    if (!stream_buffer[data.task_id]) stream_buffer[data.task_id] = "";
    stream_buffer[data.task_id] += data.chunk;
    $el.html(oly_ai.render_markdown(stream_buffer[data.task_id]));
    scroll_bottom();
  });

  frappe.realtime.on("ai_tool_call", function (data) {
    if (!data || !data.task_id) return;
    var $el = $("#stream-content-" + data.task_id);
    if (!$el.length) return;
    var tool_html = '<div class="ai-tool-indicator"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>Using tool: <strong>' + frappe.utils.escape_html(data.tool_name) + '</strong></div>';
    $el.append(tool_html);
    scroll_bottom();
  });

  frappe.realtime.on("ai_done", function (data) {
    if (!data || !data.task_id) return;
    var $el = $("#stream-content-" + data.task_id);
    if (!$el.length) return;
    $el.removeClass("ai-streaming-cursor");

    // Replace with final rendered content
    var content = data.content || stream_buffer[data.task_id] || "";
    var parts = [r_model(data), r_cost(data)].filter(Boolean).join(" &middot; ");
    $el.html(
      oly_ai.render_markdown(content) +
      '<div style="display:flex;align-items:center;gap:12px;margin-top:6px;font-size:0.75rem;">' +
        '<span class="oly-ai-copy-btn" data-text="' + frappe.utils.escape_html(content) + '" style="cursor:pointer;color:var(--text-muted);display:flex;align-items:center;gap:4px;transition:color .15s;">' + I.copy + ' Copy</span>' +
        (parts ? '<span style="color:var(--text-light);">' + parts + '</span>' : '') +
      '</div>'
    );
    wire_copy();
    enhance_code_blocks();

    // Handle pending actions
    if (data.pending_actions && data.pending_actions.length) {
      render_action_cards(data.pending_actions);
    }

    // Update title
    if (data.session_title) {
      $title.text(data.session_title);
    }

    delete stream_buffer[data.task_id];
    stream_task_id = null;
    set_sending_state(false);
    scroll_bottom();
    load_sessions();
  });

  frappe.realtime.on("ai_error", function (data) {
    if (!data || !data.task_id) return;
    var $el = $("#stream-content-" + data.task_id);
    if ($el.length) {
      $el.removeClass("ai-streaming-cursor").html(
        '<div style="color:var(--red-600);font-size:0.9rem;padding:8px 12px;background:rgba(239,68,68,0.08);border-radius:8px;">' +
        frappe.utils.escape_html(data.error || __("Something went wrong")) + '</div>'
      );
    }
    delete stream_buffer[data.task_id];
    stream_task_id = null;
    set_sending_state(false);
  });

  // ── Code block enhancements ──
  function enhance_code_blocks() {
    $msgs.find('.ai-md pre').each(function () {
      if ($(this).find('.ai-code-copy').length) return; // already enhanced
      var $pre = $(this);
      var $code = $pre.find('code');
      var lang = '';
      if ($code.length) {
        var cls = $code.attr('class') || '';
        var m = cls.match(/language-(\w+)/);
        if (m) lang = m[1];
      }
      if (lang) {
        $pre.prepend('<span class="ai-code-lang">' + lang + '</span>');
      }
      $pre.append('<button class="ai-code-copy">' + I.copy + ' Copy</button>');
    });
    $msgs.find('.ai-code-copy').off('click').on('click', function (e) {
      e.stopPropagation();
      var code = $(this).closest('pre').find('code').text() || $(this).closest('pre').text();
      frappe.utils.copy_to_clipboard(code);
      var $b = $(this);
      $b.html(I.check + ' Copied');
      setTimeout(function () { $b.html(I.copy + ' Copy'); }, 2000);
    });
  }

  // ── Export chat to markdown ──
  function export_chat() {
    if (!current_session) {
      frappe.show_alert({ message: __("No active conversation to export"), indicator: "orange" });
      return;
    }
    frappe.xcall("oly_ai.api.chat.get_messages", { session_name: current_session }).then(function (msgs) {
      if (!msgs || !msgs.length) {
        frappe.show_alert({ message: __("No messages to export"), indicator: "orange" });
        return;
      }
      var s = sessions.find(function (x) { return x.name === current_session; });
      var title = s ? s.title : "Chat";
      var md = "# " + title + "\n\n";
      md += "_Exported: " + frappe.datetime.now_datetime() + "_\n\n---\n\n";
      msgs.forEach(function (m) {
        if (m.role === "user") {
          md += "**You:** " + m.content + "\n\n";
        } else {
          md += "**AI";
          if (m.model) md += " (" + m.model + ")";
          md += ":** " + m.content + "\n\n";
        }
      });
      var blob = new Blob([md], { type: "text/markdown" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = title.replace(/[^a-zA-Z0-9]/g, "_") + ".md";
      a.click();
      URL.revokeObjectURL(url);
      frappe.show_alert({ message: __("Chat exported"), indicator: "green" });
    });
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

  // ── Drag & Drop support ──
  var drop_icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
  var drag_counter = 0;
  var $main_area = $fp.find('.oly-fp-main');
  var $input_bar = $fp.find('.oly-fp-input-bar');

  // Prevent default browser drag behavior on the whole page
  $main_area.on('dragenter', function (e) {
    e.preventDefault();
    e.stopPropagation();
    drag_counter++;
    if (drag_counter === 1) {
      // Show drop overlay
      if (!$main_area.find('.oly-fp-drop-overlay').length) {
        $main_area.css('position', 'relative');
        $main_area.append('<div class="oly-fp-drop-overlay"><span>' + drop_icon + __('Drop files here') + '</span></div>');
      }
      $input_bar.addClass('drag-over');
    }
  });

  $main_area.on('dragover', function (e) {
    e.preventDefault();
    e.stopPropagation();
  });

  $main_area.on('dragleave', function (e) {
    e.preventDefault();
    e.stopPropagation();
    drag_counter--;
    if (drag_counter <= 0) {
      drag_counter = 0;
      $main_area.find('.oly-fp-drop-overlay').remove();
      $input_bar.removeClass('drag-over');
    }
  });

  $main_area.on('drop', function (e) {
    e.preventDefault();
    e.stopPropagation();
    drag_counter = 0;
    $main_area.find('.oly-fp-drop-overlay').remove();
    $input_bar.removeClass('drag-over');

    var dt = e.originalEvent.dataTransfer;
    if (!dt || !dt.files || !dt.files.length) return;
    handle_dropped_files(dt.files);
  });

  // ── Clipboard paste support (Ctrl+V / Cmd+V) ──
  $input.on('paste', function (e) {
    var cd = e.originalEvent.clipboardData;
    if (!cd || !cd.items) return;

    var dominated_by_files = false;
    var paste_files = [];

    for (var i = 0; i < cd.items.length; i++) {
      var item = cd.items[i];
      if (item.kind === 'file') {
        var file = item.getAsFile();
        if (file) {
          paste_files.push(file);
          dominated_by_files = true;
        }
      }
    }

    if (dominated_by_files && paste_files.length) {
      e.preventDefault(); // prevent pasting file name as text
      handle_dropped_files(paste_files);
    }
    // If no files, let normal text paste happen
  });

  function handle_dropped_files(file_list) {
    var valid_files = [];
    var accepted = /\.(jpg|jpeg|png|gif|webp|bmp|svg|pdf|txt|csv|xlsx|xls|doc|docx|json|xml|md|pptx|ppt)$/i;
    var max_size = 20 * 1024 * 1024; // 20MB

    for (var i = 0; i < file_list.length; i++) {
      var f = file_list[i];
      // Accept images by mime or known extensions
      if (f.type && f.type.startsWith('image/')) {
        valid_files.push(f);
      } else if (accepted.test(f.name)) {
        valid_files.push(f);
      } else {
        frappe.show_alert({ message: __('Unsupported file type: {0}', [f.name]), indicator: 'orange' });
        continue;
      }
      if (f.size > max_size) {
        frappe.show_alert({ message: __('File too large (max 20MB): {0}', [f.name]), indicator: 'orange' });
        valid_files.pop();
      }
    }

    if (!valid_files.length) return;

    // Show uploading indicator
    $attach_preview.append('<div class="oly-fp-uploading" id="fp-uploading"><div class="spinner"></div>' + __('Uploading {0} file(s)...', [valid_files.length]) + '</div>');

    var promises = valid_files.map(function (f) { return upload_file(f); });
    Promise.all(promises).then(function (uploaded) {
      $('#fp-uploading').remove();
      attached_files = attached_files.concat(uploaded);
      render_attachments();
      frappe.show_alert({ message: __('Attached {0} file(s)', [uploaded.length]), indicator: 'green' });
      $input.focus();
    }).catch(function () {
      $('#fp-uploading').remove();
      frappe.show_alert({ message: __('Failed to upload file(s)'), indicator: 'red' });
    });
  }

  // Model selector
  $model.on("change", function () {
    current_model = $(this).val();
  });
  // Mode selector
  // Recommended models per mode based on testing
  var mode_recommended_models = {
    ask: 'gpt-4o-mini',       // Fast, cheap, good for Q&A
    research: 'gpt-5.2',      // Best quality, thorough analysis
    agent: 'gpt-5.1',         // Smart + fast, good with tools
    execute: 'gpt-4o-mini',   // Fast, reliable for structured actions
  };

  $(document).on("click", ".oly-fp-mode", function () {
    $(".oly-fp-mode").removeClass("active");
    $(this).addClass("active");
    current_mode = $(this).data("mode");
    var placeholders = {
      ask: __("Message AI..."),
      research: __("What should I research in depth?"),
      agent: __("Describe what you need help with..."),
      execute: __("What action should I execute?"),
    };
    $input.attr("placeholder", placeholders[current_mode] || placeholders.ask);

    // Auto-switch to recommended model for this mode (if available in dropdown)
    var rec = mode_recommended_models[current_mode];
    if (rec && $model.find('option[value="' + rec + '"]').length) {
      $model.val(rec).trigger('change');
    }
  });
  // Export button
  $("#fp-export").on("click", export_chat);

  // ── Keyboard shortcuts ──
  $(document).on("keydown.oly_ai_page", function (e) {
    // Ctrl+/ or Cmd+/ — focus the input
    if ((e.ctrlKey || e.metaKey) && e.key === "/") {
      e.preventDefault();
      $input.focus();
    }
    // Ctrl+Shift+N or Cmd+Shift+N — new chat
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "N" || e.key === "n")) {
      e.preventDefault();
      new_chat();
    }
    // Ctrl+Shift+E or Cmd+Shift+E — export
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "E" || e.key === "e")) {
      e.preventDefault();
      export_chat();
    }
    // Ctrl+B or Cmd+B — toggle sidebar
    if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B") && !e.shiftKey) {
      e.preventDefault();
      sidebar_open = !sidebar_open;
      $fp.toggleClass("fp-sidebar-closed", !sidebar_open);
    }
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
  load_user_access();
  $input.focus();
};
