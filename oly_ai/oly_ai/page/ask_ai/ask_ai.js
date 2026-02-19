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
      /* share filter tabs */
      '.oly-fp-share-tabs{display:flex;gap:2px;padding:0 12px 8px;}',
      '.oly-fp-share-tab{flex:1;text-align:center;padding:5px 0;font-size:0.7rem;font-weight:600;color:var(--text-muted);background:transparent;border:1px solid transparent;border-radius:6px;cursor:pointer;font-family:inherit;transition:all .12s;}',
      '.oly-fp-share-tab:hover{color:var(--text-color);background:var(--bg-light-gray);}',
      '.oly-fp-share-tab.active{color:var(--text-color);background:var(--control-bg);border-color:var(--dark-border-color);}',
      '[data-theme="dark"] .oly-fp-share-tab.active{color:white !important;background:var(--gray-700) !important;border-color:var(--gray-600) !important;}',
      /* shared badge on session items */
      '.oly-fp-shared-badge{font-size:0.6rem;color:var(--text-muted);background:var(--control-bg);border-radius:4px;padding:1px 5px;margin-left:4px;white-space:nowrap;}',
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
      /* stop button — same style as send btn */
      '.oly-fp-stop-btn{cursor:pointer;height:32px;width:32px;min-width:32px;border-radius:50%;background:var(--primary-color);color:white;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:none;padding:0;animation:oly-pulse 1.5s ease-in-out infinite;}',
      '.oly-fp-stop-btn:hover{opacity:0.85;}',
      '@keyframes oly-pulse{0%,100%{box-shadow:0 0 0 0 rgba(var(--primary-color-rgb,59,130,246),0.4);}50%{box-shadow:0 0 0 6px rgba(var(--primary-color-rgb,59,130,246),0);}}',
      '[data-theme="dark"] .oly-fp .oly-fp-stop-btn{background:white !important;}',
      '[data-theme="dark"] .oly-fp .oly-fp-stop-btn svg rect{fill:#1a1a1a !important;}',
      /* streaming cursor */
      '.ai-streaming-cursor::after{content:"▊";animation:ai-blink 1s infinite;color:var(--primary-color);}',
      '@keyframes ai-blink{0%,100%{opacity:1;}50%{opacity:0;}}',
      /* header overflow menu (3-dots) */
      '.oly-fp-more-wrap{position:relative;display:flex;align-items:center;}',
      '.oly-fp-more-btn{background:none;border:none;color:var(--text-muted);cursor:pointer;padding:6px;border-radius:8px;display:flex;align-items:center;justify-content:center;transition:all .15s;}',
      '.oly-fp-more-btn:hover{color:var(--text-color);background:var(--control-bg);}',
      '.oly-fp-more-menu{position:absolute;top:100%;right:0;margin-top:6px;min-width:170px;background:var(--card-bg);border:1px solid var(--dark-border-color);border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.14);padding:6px;display:none;z-index:120;}',
      '.oly-fp-more-menu.show{display:block;}',
      '.oly-fp-more-item{display:flex;align-items:center;gap:8px;width:100%;background:none;border:none;text-align:left;color:var(--text-color);padding:8px 10px;border-radius:8px;cursor:pointer;font-size:0.8125rem;transition:all .12s;}',
      '.oly-fp-more-item:hover{background:var(--control-bg);}',
      '.oly-fp-more-item svg{width:14px;height:14px;color:var(--text-muted);}',
      /* modern session list icon chip */
      '.oly-fp-sb-item-icon{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:22px;height:22px;border-radius:8px;background:var(--control-bg);color:var(--text-muted);}',
      '.oly-fp-sb-item-icon svg{width:13px;height:13px;stroke:currentColor;}',
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
  var stream_task_id = null;
  var stream_buffer = {};
  var stream_poll_timer = null;  // polling fallback timer
  var stream_poll_session = null; // session being polled
  var stream_poll_msg_count = 0;  // message count when stream started
  var _sending_safety_timer = null;  // safety timer to re-enable input
  var _active_request_id = null;    // tracks active request for cancellation
  var _fp_recording = false;
  var _fp_media_recorder = null;
  var _fp_audio_chunks = [];
  var current_filter = 'mine'; // 'mine' | 'shared' | 'all'
  var _fp_rec_stream = null;
  var _fp_rec_timer = null;
  var _fp_tts_audio = null;

  var I = oly_ai.ICON;

  // ── Stop icon SVG (square stop, same color scheme as send) ──
  var stop_icon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="none"><rect x="6" y="6" width="12" height="12" rx="2" fill="white"/></svg>';

  // ── Sending state management ──
  function set_sending_state(is_sending) {
    sending = is_sending;
    // Clear any existing safety timer
    if (_sending_safety_timer) {
      clearTimeout(_sending_safety_timer);
      _sending_safety_timer = null;
    }
    var $btn = $("#fp-send");
    var $inp = $("#fp-input");
    if (is_sending) {
      // Replace send button with stop button
      $btn.replaceWith(
        '<span class="oly-fp-stop-btn" id="fp-send" title="' + __("Stop generating") + '">' + stop_icon + '</span>'
      );
      $("#fp-send").on("click", stop_generation);
      // Keep input enabled so user can type their next message while AI responds
      $inp.attr("placeholder", __("Type your next message..."));
      // Safety timer — re-enable input after 120s no matter what
      _sending_safety_timer = setTimeout(function () {
        if (sending) {
          console.warn("[Ask AI] Safety timeout: re-enabling input after 120s");
          set_sending_state(false);
        }
      }, 120000);
    } else {
      // Restore send button
      var $cur = $("#fp-send");
      $cur.replaceWith(
        '<span class="oly-ai-send-btn" id="fp-send" style="cursor:pointer;height:32px;width:32px;min-width:32px;border-radius:50%;background:var(--primary-color);color:white;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + I.send + '</span>'
      );
      $("#fp-send").on("click", send_message);
      $inp.attr("placeholder", __("Message AI..."));
    }
    // Update cached reference
    $send = $("#fp-send");
  }

  function stop_generation() {
    if (!sending) return;
    _stop_poll();
    // Invalidate active request so its response is ignored
    _active_request_id = null;
    // Remove typing indicator if present
    $msgs.find('.oly-ai-typing').closest('div[style*="max-width"]').last().remove();
    // Also handle streaming if active
    if (stream_task_id) {
      var $el = $("#stream-content-" + stream_task_id);
      if ($el.length) {
        $el.removeClass("ai-streaming-cursor");
        var partial = stream_buffer[stream_task_id] || "";
        if (partial) {
          $el.html(
            oly_ai.render_markdown(partial) +
            '<div style="font-size:0.75rem;color:var(--text-muted);margin-top:6px;">⏹ ' + __("Generation stopped") + '</div>'
          );
        }
      }
      delete stream_buffer[stream_task_id];
      stream_task_id = null;
    }
    set_sending_state(false);
  }

  // ── Polling fallback — if Socket.IO events don't arrive, fetch from DB ──
  function _start_poll(session_name, task_id, msg_count) {
    _stop_poll();
    stream_poll_session = session_name;
    stream_poll_msg_count = msg_count;
    var poll_attempts = 0;
    var max_attempts = 40; // 40 * 3s = 120s max
    stream_poll_timer = setInterval(function () {
      poll_attempts++;
      if (poll_attempts > max_attempts) {
        _stop_poll();
        // Timeout — show error
        var $el = $("#stream-content-" + task_id);
        if ($el.length && !stream_buffer[task_id]) {
          $el.removeClass("ai-streaming-cursor").html(
            '<div style="color:var(--red-600);font-size:0.9rem;">⏱ ' + __("Response timed out. Please try again.") + '</div>'
          );
          set_sending_state(false);
        }
        return;
      }
      // If we already have streamed content, skip polling
      if (stream_buffer[task_id] && stream_buffer[task_id].length > 0) return;
      // Poll DB for new assistant message
      frappe.xcall("oly_ai.api.chat.get_messages", { session_name: session_name })
        .then(function (msgs) {
          if (!msgs || msgs.length <= stream_poll_msg_count) return;
          // Found new message(s) — the worker finished!
          var last = msgs[msgs.length - 1];
          if (last.role === "assistant") {
            _stop_poll();
            var $el = $("#stream-content-" + task_id);
            if ($el.length) {
              $el.removeClass("ai-streaming-cursor");
              var parts = [r_model(last), r_cost(last)].filter(Boolean).join(" &middot; ");
              $el.html(
                oly_ai.render_markdown(last.content || "") +
                '<div style="display:flex;align-items:center;gap:12px;margin-top:6px;font-size:0.75rem;">' +
                  '<span class="oly-ai-copy-btn" data-text="' + frappe.utils.escape_html(last.content || "") + '" style="cursor:pointer;color:var(--text-muted);display:flex;align-items:center;gap:4px;transition:color .15s;">' + I.copy + ' Copy</span>' +
                  (parts ? '<span style="color:var(--text-light);">' + parts + '</span>' : '') +
                '</div>'
              );
              wire_copy();
              enhance_code_blocks();
            }
            delete stream_buffer[task_id];
            stream_task_id = null;
            set_sending_state(false);
            scroll_bottom();
            load_sessions();
          }
        })
        .catch(function () { /* ignore polling errors */ });
    }, 3000);
  }

  function _stop_poll() {
    if (stream_poll_timer) {
      clearInterval(stream_poll_timer);
      stream_poll_timer = null;
    }
  }

  function _recover_from_db(task_id) {
    // One-shot: try to load last message from DB
    if (!current_session) return;
    frappe.xcall("oly_ai.api.chat.get_messages", { session_name: current_session })
      .then(function (msgs) {
        if (!msgs || !msgs.length) return;
        var last = msgs[msgs.length - 1];
        if (last.role === "assistant") {
          var $el = $("#stream-content-" + task_id);
          if ($el.length) {
            var parts = [r_model(last), r_cost(last)].filter(Boolean).join(" &middot; ");
            $el.html(
              oly_ai.render_markdown(last.content || "") +
              '<div style="display:flex;align-items:center;gap:12px;margin-top:6px;font-size:0.75rem;">' +
                '<span class="oly-ai-copy-btn" data-text="' + frappe.utils.escape_html(last.content || "") + '" style="cursor:pointer;color:var(--text-muted);display:flex;align-items:center;gap:4px;transition:color .15s;">' + I.copy + ' Copy</span>' +
                (parts ? '<span style="color:var(--text-light);">' + parts + '</span>' : '') +
              '</div>'
            );
            wire_copy();
            enhance_code_blocks();
          }
        }
      })
      .catch(function () {});
  }

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
        '<button class="oly-fp-sb-new" id="fp-new" style="width:100%;display:flex;align-items:center;gap:8px;padding:10px 14px;border:1px solid var(--dark-border-color);border-radius:10px;background:transparent;color:var(--text-color);cursor:pointer;font-size:0.875rem;font-weight:500;">' +
          I.plus + '<span>' + __("New chat") + '</span>' +
        '</button>' +
      '</div>' +
      '<div style="padding:0 12px 8px;">' +
        '<input type="text" id="fp-search" placeholder="' + __("Search...") + '" style="width:100%;padding:8px 12px;border:1px solid var(--dark-border-color);border-radius:8px;background:var(--control-bg);color:var(--text-color);font-size:0.8125rem;outline:none;font-family:inherit;" />' +
      '</div>' +
      '<div class="oly-fp-share-tabs" id="fp-share-tabs">' +
        '<button class="oly-fp-share-tab active" data-filter="mine">' + __("My Chats") + '</button>' +
        '<button class="oly-fp-share-tab" data-filter="shared">' + __("Shared") + '</button>' +
        '<button class="oly-fp-share-tab" data-filter="all">' + __("All") + '</button>' +
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
        '<div class="oly-fp-more-wrap" style="margin-left:auto;">' +
          '<button class="oly-fp-more-btn" id="fp-more-btn" title="' + __("More options") + '">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>' +
          '</button>' +
          '<div class="oly-fp-more-menu" id="fp-more-menu">' +
            '<button class="oly-fp-more-item" data-act="share"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>' + __("Share chat") + '</button>' +
            '<button class="oly-fp-more-item" data-act="export"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>' + __("Export chat") + '</button>' +
            '<button class="oly-fp-more-item" data-act="new"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' + __("New chat") + '</button>' +
            '<button class="oly-fp-more-item" data-act="toggle-sidebar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/></svg>' + __("Toggle sidebar") + '</button>' +
            '<button class="oly-fp-more-item" data-act="memory"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a5 5 0 015 5c0 .8-.2 1.5-.5 2.2A5 5 0 0119 14a5 5 0 01-3 4.6V22h-2v-3.4A5 5 0 0111 14a5 5 0 01-2.5-4.3A5 5 0 017 7a5 5 0 015-5z"/><path d="M12 2v4"/><path d="M8 6.5C8 8 9.8 9 12 9s4-1 4-2.5"/></svg>' + __("Manage memory") + '</button>' +
          '</div>' +
        '</div>' +
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
          '<span id="fp-mic-btn" style="cursor:pointer;height:32px;width:32px;min-width:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--text-muted);flex-shrink:0;transition:all 0.2s;" title="' + __("Voice input") + '">' + I.mic + '</span>' +
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
  var $more_btn = $("#fp-more-btn");
  var $more_menu = $("#fp-more-menu");

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
    frappe.call({
      method: "oly_ai.api.chat.get_model_catalog",
      callback: function (r) {
        var res = r && r.message;
        if (!res || !res.models) return;
        available_models = res.models;
        if (res.default_model) current_model = res.default_model;
        render_model_selector_options(available_models, res.default_model);
      },
      error: function () {
        render_model_selector_options(available_models, current_model);
      },
    });
  }

  render_model_selector_options(available_models, current_model);
  load_model_catalog();

  // ── Welcome ──
  function show_welcome() {
    $msgs.html(
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:20px;">' +
        '<div style="width:64px;height:64px;border-radius:50%;background:' + oly_ai.brand_gradient() + ';display:flex;align-items:center;justify-content:center;margin-bottom:16px;color:white;">' + I.sparkles_lg + '</div>' +
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
    frappe.call({
      method: "oly_ai.api.chat.get_sessions",
      args: { filter_type: current_filter },
      callback: function (r) {
        sessions = (r && r.message) || [];
        render_sessions(sessions);
      },
      error: function () {
        console.error("[Ask AI] Failed to load sessions");
      },
    });
  }

  function render_sessions(list) {
    if (!list.length) {
      var empty_msg = current_filter === 'shared' ? __("No shared conversations") : __("No conversations yet");
      $list.html('<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:0.8125rem;">' + empty_msg + '</div>');
      return;
    }
    var groups = group_by_date(list);
    var html = "";
    groups.forEach(function (g) {
      html += '<div style="margin-bottom:4px;">';
      html += '<div style="padding:8px 8px 4px;font-size:0.7rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;">' + g.label + '</div>';
      g.items.forEach(function (s) {
        var active = current_session === s.name ? " active" : "";
        var is_mine = s.is_owner !== false;
        html += '<div class="oly-fp-sb-item' + active + '" data-name="' + s.name + '" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;font-size:0.8125rem;color:var(--text-color);position:relative;transition:background .12s;">';
        html += '<span class="oly-fp-sb-item-title" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + frappe.utils.escape_html(s.title || __("Untitled"));
        if (!is_mine && s.owner_name) {
          html += '<span class="oly-fp-shared-badge">' + frappe.utils.escape_html(s.owner_name) + '</span>';
        }
        html += '</span>';
        html += '<span class="oly-fp-sb-item-acts" style="display:flex;gap:2px;flex-shrink:0;">';
        if (is_mine) {
          html += '<button class="oly-fp-sb-act" data-act="share" data-name="' + s.name + '" title="' + __("Share") + '" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:2px;display:flex;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>';
          html += '<button class="oly-fp-sb-act" data-act="edit" data-name="' + s.name + '" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:2px;display:flex;">' + I.edit + '</button>';
          html += '<button class="oly-fp-sb-act" data-act="delete" data-name="' + s.name + '" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:2px;display:flex;">' + I.trash + '</button>';
        }
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
    $list.find('[data-act="share"]').on("click", function (e) {
      e.stopPropagation(); show_share_dialog($(this).data("name"));
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
    // Reset sending state if stuck from a previous request
    if (sending) {
      _stop_poll();
      _active_request_id = null;
      set_sending_state(false);
    }
    $title.text(__("New Chat"));
    show_welcome();
    clear_attachments();
    $list.find(".oly-fp-sb-item").removeClass("active");
    $input.val("").css("height", "auto").focus();
  }

  function open_session(name) {
    current_session = name;
    clear_attachments();
    // Reset sending state if stuck from a previous request
    if (sending) {
      _stop_poll();
      _active_request_id = null;
      set_sending_state(false);
    }
    $list.find(".oly-fp-sb-item").removeClass("active");
    $list.find('[data-name="' + name + '"]').first().addClass("active");
    var s = sessions.find(function (x) { return x.name === name; });
    $title.text(s ? s.title : __("Chat"));
    // Show loading indicator
    $msgs.html(
      '<div style="display:flex;align-items:center;justify-content:center;height:100%;padding:40px;">' +
        '<div class="oly-ai-typing"><span></span><span></span><span></span></div>' +
      '</div>'
    );
    frappe.call({
      method: "oly_ai.api.chat.get_messages",
      args: { session_name: name },
      callback: function (r) {
        if (current_session !== name) return;
        try {
          var msgs = r && r.message;
          $msgs.empty();
          if (!msgs || !msgs.length) { show_welcome(); return; }
          msgs.forEach(function (m) {
            if (m.role === "user") append_user_msg(m.content || "");
            else append_ai_msg(m.content || "", m);
          });
          scroll_bottom();
        } catch (renderErr) {
          console.error("[Ask AI] Render error:", renderErr);
          $msgs.html(
            '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:0.9rem;cursor:pointer;padding:20px;text-align:center;">' +
              '<div>' + __("Error rendering messages. Click to retry.") + '</div>' +
              '<div style="font-size:0.75rem;margin-top:8px;color:var(--red-500);">' + frappe.utils.escape_html(String(renderErr)) + '</div>' +
            '</div>'
          );
          $msgs.one("click", function () { open_session(name); });
        }
      },
      error: function (r) {
        if (current_session !== name) return;
        var detail = (r && r.message) || (r && r._server_messages) || "";
        console.error("[Ask AI] API error loading messages:", r, detail);
        $msgs.html(
          '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:0.9rem;cursor:pointer;padding:20px;text-align:center;">' +
            '<div>' + __("Failed to load messages. Click to retry.") + '</div>' +
            (detail ? '<div style="font-size:0.75rem;margin-top:8px;color:var(--red-500);">' + frappe.utils.escape_html(String(detail)) + '</div>' : '') +
          '</div>'
        );
        $msgs.one("click", function () { open_session(name); });
      },
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

  // ── Share Dialog ──
  function show_share_dialog(session_name) {
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
            frappe.show_alert({ message: __("Already shared with selected users"), indicator: "blue" });
          }
          d.hide();
          load_sessions();
        });
      },
    });

    // Load existing shared users
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
            '<span class="fp-unshare-btn" data-user="' + r.user + '" style="cursor:pointer;color:var(--text-muted);font-weight:700;margin-left:2px;">&times;</span>' +
          '</span>';
        });
        html += '</div>';
        d.fields_dict.shared_list_html.$wrapper.html(html);
        d.fields_dict.shared_list_html.$wrapper.find('.fp-unshare-btn').on('click', function () {
          var u = $(this).data('user');
          frappe.xcall("oly_ai.api.chat.unshare_session", {
            session_name: session_name,
            unshare_user: u,
          }).then(function () {
            frappe.show_alert({ message: __("Removed"), indicator: "orange" });
            d.hide();
            show_share_dialog(session_name); // re-open to refresh
          });
        });
      }
    });

    d.show();
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
    var escaped = frappe.utils.escape_html(text);
    $msgs.append(
      w() +
      '<div class="oly-fp-user-row" style="display:flex;gap:12px;margin-bottom:20px;justify-content:flex-end;">' +
        '<div style="max-width:75%;display:flex;flex-direction:column;align-items:flex-end;">' +
          '<div class="oly-fp-user-bubble" style="background:var(--primary-color);color:white;border-radius:18px 18px 4px 18px;padding:10px 16px;font-size:0.9rem;line-height:1.5;word-break:break-word;">' +
            escaped +
          '</div>' +
          '<span class="oly-fp-user-copy" data-text="' + escaped + '" style="display:flex;align-items:center;gap:3px;cursor:pointer;color:var(--text-muted);font-size:0.6875rem;padding:3px 4px;margin-top:2px;opacity:0;transition:opacity 0.15s;">' + I.copy + '</span>' +
        '</div>' +
        user_avatar_sm +
      '</div></div>'
    );
    $msgs.find('.oly-fp-user-row:last').on('mouseenter', function () {
      $(this).find('.oly-fp-user-copy').css('opacity', '1');
    }).on('mouseleave', function () {
      $(this).find('.oly-fp-user-copy').css('opacity', '0');
    });
    $msgs.find('.oly-fp-user-copy:last').on('click', function () {
      frappe.utils.copy_to_clipboard($(this).data('text'));
      var $b = $(this);
      $b.html(I.check);
      setTimeout(function () { $b.html(I.copy); }, 1500);
    });
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
            '<span class="oly-ai-tts-btn" style="cursor:pointer;color:var(--text-muted);display:flex;align-items:center;gap:4px;transition:color .15s;" title="' + __("Listen") + '">' + I.speaker + '</span>' +
            (parts ? '<span style="color:var(--text-light);">' + parts + '</span>' : '') +
          '</div>' +
        '</div>' +
      '</div></div>'
    );
    wire_copy();
    wire_tts();
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

  // ── Send message ──
  function send_message() {
    var q = $input.val().trim();
    if (!q || sending) return;
    set_sending_state(true);
    $input.val("").css("height", "auto");

    var files_to_send = attached_files.slice();
    clear_attachments();
    var sel_model = $model.val();
    var request_id = "req-" + Date.now();
    _active_request_id = request_id;

    var fire = function (sid) {
      // Remove welcome screen
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

      // Use sync API — reliable, returns complete response
      frappe.call({
        method: "oly_ai.api.chat.send_message",
        args: {
          session_name: sid,
          message: q,
          model: sel_model,
          mode: current_mode,
          file_urls: file_urls.length ? JSON.stringify(file_urls) : null,
        },
        callback: function (r) {
          // Ignore if this request was cancelled (user clicked stop or sent another)
          if (_active_request_id !== request_id) return;
          try {
            var data = r && r.message;
            $("#" + lid).closest('div[style*="max-width"]').remove();
            append_ai_msg(data.content || "", data);
            if (data.pending_actions && data.pending_actions.length) {
              render_action_cards(data.pending_actions);
            }
            scroll_bottom();
            set_sending_state(false);
            load_sessions();
          } catch (renderErr) {
            console.error("[Ask AI] Render error after send:", renderErr);
            $("#" + lid).closest('div[style*="max-width"]').html(
              '<div style="display:flex;gap:12px;margin-bottom:20px;align-items:flex-start;">' +
                '<div style="width:28px;height:28px;min-width:28px;border-radius:50%;background:var(--red-100);color:var(--red-600);display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">!</div>' +
                '<div style="flex:1;color:var(--red-600);font-size:0.9rem;">' + frappe.utils.escape_html(String(renderErr)) + '</div>' +
              '</div>'
            );
            set_sending_state(false);
          }
        },
        error: function (r) {
          if (_active_request_id !== request_id) return;
          var detail = (r && r.message) || (r && r._server_messages) || __("Something went wrong. Please try again.");
          console.error("[Ask AI] Send error:", r, detail);
          $("#" + lid).closest('div[style*="max-width"]').html(
            '<div style="display:flex;gap:12px;margin-bottom:20px;align-items:flex-start;">' +
              '<div style="width:28px;height:28px;min-width:28px;border-radius:50%;background:var(--red-100);color:var(--red-600);display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;">!</div>' +
              '<div style="flex:1;color:var(--red-600);font-size:0.9rem;">' + frappe.utils.escape_html(String(detail)) + '</div>' +
            '</div>'
          );
          set_sending_state(false);
        },
      });
    };

    if (!current_session) {
      frappe.call({
        method: "oly_ai.api.chat.create_session",
        args: { title: q.substring(0, 60) },
        callback: function (r) {
          var s = r && r.message;
          if (!s || !s.name) {
            set_sending_state(false);
            frappe.show_alert({message: __("Failed to create session"), indicator: "red"});
            return;
          }
          current_session = s.name;
          $title.text(s.title || __("New Chat"));
          load_sessions();
          fire(s.name);
        },
        error: function (r) {
          set_sending_state(false);
          var detail = (r && r.message) || __("Failed to create session");
          frappe.show_alert({message: String(detail), indicator: "red"});
        },
      });
    } else {
      fire(current_session);
    }
  }

  // ── Realtime event listeners for streaming ──

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
    _stop_poll(); // Realtime worked — stop polling
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
        '<span class="oly-ai-tts-btn" style="cursor:pointer;color:var(--text-muted);display:flex;align-items:center;gap:4px;transition:color .15s;" title="Listen">' + I.speaker + '</span>' +
        (parts ? '<span style="color:var(--text-light);">' + parts + '</span>' : '') +
      '</div>'
    );
    wire_copy();
    wire_tts();
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
    _stop_poll(); // Realtime worked — stop polling
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
  $("#fp-mic-btn").on("click", function () {
    if (_fp_recording) fp_stop_recording(); else fp_start_recording();
  });
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
  // Share filter tabs
  $("#fp-share-tabs").on("click", ".oly-fp-share-tab", function () {
    var f = $(this).data("filter");
    if (f === current_filter) return;
    current_filter = f;
    $("#fp-share-tabs .oly-fp-share-tab").removeClass("active");
    $(this).addClass("active");
    load_sessions();
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
  // 3-dots overflow actions
  $more_btn.on("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    $more_menu.toggleClass("show");
  });

  $more_menu.on("click", "[data-act]", function (e) {
    e.preventDefault();
    var act = $(this).data("act");
    $more_menu.removeClass("show");

    if (act === "share") {
      if (current_session) {
        show_share_dialog(current_session);
      } else {
        frappe.show_alert({ message: __('Start a chat first'), indicator: 'yellow' });
      }
    } else if (act === "export") {
      export_chat();
    } else if (act === "new") {
      new_chat();
    } else if (act === "toggle-sidebar") {
      sidebar_open = !sidebar_open;
      $fp.toggleClass("fp-sidebar-closed", !sidebar_open);
    } else if (act === "memory") {
      window.open("/app/ai-user-memory", "_blank");
    }
  });

  $(document).on("click", function (e) {
    if (!$(e.target).closest(".oly-fp-more-wrap").length) {
      $more_menu.removeClass("show");
    }
  });

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

  // ── Voice: Recording ──
  function fp_start_recording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      frappe.show_alert({ message: __('Your browser does not support microphone access'), indicator: 'red' });
      return;
    }
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      _fp_recording = true;
      _fp_audio_chunks = [];
      _fp_rec_stream = stream;
      var options = MediaRecorder.isTypeSupported('audio/webm') ? { mimeType: 'audio/webm' } : {};
      _fp_media_recorder = new MediaRecorder(stream, options);
      _fp_media_recorder.ondataavailable = function (e) {
        if (e.data.size > 0) _fp_audio_chunks.push(e.data);
      };
      _fp_media_recorder.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop(); });
        var blob = new Blob(_fp_audio_chunks, { type: _fp_media_recorder.mimeType || 'audio/webm' });
        _fp_audio_chunks = [];
        fp_send_voice(blob);
      };
      _fp_media_recorder.start();
      // Visual: red pulsing mic
      var $mic = $('#fp-mic-btn');
      $mic.css({ background: 'var(--red)', color: 'white', 'border-radius': '50%' });
      $mic.html('<svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="none"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/></svg>');
      $mic.css('animation', 'oly-pulse 1.2s ease-in-out infinite');
      if (!document.getElementById('oly-pulse-kf')) {
        var style = document.createElement('style');
        style.id = 'oly-pulse-kf';
        style.textContent = '@keyframes oly-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.7;transform:scale(1.1)}}';
        document.head.appendChild(style);
      }
      _fp_rec_timer = setTimeout(function () { if (_fp_recording) fp_stop_recording(); }, 60000);
    }).catch(function (err) {
      console.error('Mic access denied:', err);
      frappe.show_alert({ message: __('Microphone access denied'), indicator: 'orange' });
    });
  }

  function fp_stop_recording() {
    _fp_recording = false;
    if (_fp_rec_timer) { clearTimeout(_fp_rec_timer); _fp_rec_timer = null; }
    if (_fp_media_recorder && _fp_media_recorder.state !== 'inactive') {
      _fp_media_recorder.stop();
    }
    var $mic = $('#fp-mic-btn');
    $mic.css({ background: 'transparent', color: 'var(--text-muted)', animation: 'none' });
    $mic.html(I.mic);
  }

  function fp_send_voice(blob) {
    $input.attr('placeholder', __('Transcribing...'));
    var $mic = $('#fp-mic-btn');
    $mic.css('opacity', '0.5').css('pointer-events', 'none');

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
          $input.val(text);
          $input[0].style.height = 'auto';
          $input[0].style.height = Math.min($input[0].scrollHeight, 150) + 'px';
          send_message();
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
        $mic.css('opacity', '1').css('pointer-events', 'auto');
        $input.attr('placeholder', __('Message AI...'));
      }
    });
  }

  // ── Voice: TTS Playback ──
  function wire_tts() {
    $msgs.find('.oly-ai-tts-btn').off('click').on('click', function () {
      var $btn = $(this);
      var txt = $btn.closest('div[style*="display:flex"]').siblings().not('div[style*="display:flex"]').text();
      if (!txt) txt = $btn.closest('div[style*="flex:1"]').clone().children('div[style*="display:flex"]').remove().end().text();
      fp_play_tts($btn, txt);
    });
  }

  function fp_play_tts($btn, text) {
    if (!text || !text.trim()) return;
    if (_fp_tts_audio && !_fp_tts_audio.paused) {
      _fp_tts_audio.pause();
      _fp_tts_audio = null;
      $btn.html(I.speaker).css('color', 'var(--text-muted)');
      return;
    }
    var send_text = text.trim().substring(0, 4096);
    $btn.html('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite"><circle cx="12" cy="12" r="10" stroke-dasharray="30 60"/></svg>').css('color', oly_ai.brand_color());
    frappe.call({
      method: 'oly_ai.api.voice.text_to_speech',
      args: { text: send_text },
      callback: function (r) {
        var data = r && r.message;
        if (data && data.audio_base64) {
          var audio = new Audio('data:' + (data.content_type || 'audio/mpeg') + ';base64,' + data.audio_base64);
          _fp_tts_audio = audio;
          $btn.html(I.stop).css('color', oly_ai.brand_color());
          audio.onended = function () { $btn.html(I.speaker).css('color', 'var(--text-muted)'); _fp_tts_audio = null; };
          audio.onerror = function () { $btn.html(I.speaker).css('color', 'var(--text-muted)'); _fp_tts_audio = null; };
          audio.play();
        } else {
          $btn.html(I.speaker).css('color', 'var(--text-muted)');
          frappe.show_alert({ message: __('TTS failed'), indicator: 'red' });
        }
      },
      error: function () {
        $btn.html(I.speaker).css('color', 'var(--text-muted)');
        frappe.show_alert({ message: __('TTS failed'), indicator: 'red' });
      }
    });
  }

  // ── Init ──
  show_welcome();
  load_sessions();
  load_user_access();
  $input.focus();
};
