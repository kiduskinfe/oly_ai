/* AI Dashboard — Admin usage analytics, cost tracking, and action history
 * Route: /app/ai-dashboard
 * Access: System Manager only
 */
frappe.pages["ai-dashboard"].on_page_load = function (wrapper) {
  var page = frappe.ui.make_app_page({
    parent: wrapper,
    title: __("AI Dashboard"),
    single_column: true,
  });

  // Inject styles
  if (!document.getElementById("oly-dash-styles")) {
    var s = document.createElement("style");
    s.id = "oly-dash-styles";
    s.textContent = [
      ".oly-dash{padding:20px;max-width:1200px;margin:0 auto;}",
      ".oly-dash-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px;}",
      ".oly-dash-card{background:var(--card-bg);border:1px solid var(--dark-border-color);border-radius:12px;padding:20px;}",
      ".oly-dash-card .label{font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;font-weight:600;}",
      ".oly-dash-card .value{font-size:1.8rem;font-weight:700;color:var(--heading-color);margin:4px 0;}",
      ".oly-dash-card .sub{font-size:0.8rem;color:var(--text-muted);}",
      ".oly-dash-card.accent{border-left:4px solid var(--primary-color);}",
      ".oly-dash-section{background:var(--card-bg);border:1px solid var(--dark-border-color);border-radius:12px;padding:20px;margin-bottom:20px;}",
      ".oly-dash-section h3{font-size:1rem;font-weight:600;color:var(--heading-color);margin:0 0 16px;}",
      ".oly-dash-table{width:100%;border-collapse:collapse;font-size:0.85rem;}",
      ".oly-dash-table th{text-align:left;padding:8px 12px;border-bottom:2px solid var(--dark-border-color);color:var(--text-muted);font-weight:600;font-size:0.75rem;text-transform:uppercase;}",
      ".oly-dash-table td{padding:8px 12px;border-bottom:1px solid var(--border-color);}",
      ".oly-dash-table tr:hover td{background:var(--bg-light-gray);}",
      ".oly-dash-bar{height:8px;background:var(--control-bg);border-radius:4px;overflow:hidden;margin-top:6px;}",
      ".oly-dash-bar-fill{height:100%;border-radius:4px;transition:width .6s ease;}",
      ".oly-dash-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;}",
      ".oly-dash-badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:0.7rem;font-weight:600;}",
      ".oly-dash-badge.success{background:var(--green-100);color:var(--green-700);}",
      ".oly-dash-badge.pending{background:var(--yellow-100);color:var(--yellow-700);}",
      ".oly-dash-badge.error{background:var(--red-100);color:var(--red-600);}",
      ".oly-dash-badge.rejected{background:var(--gray-200);color:var(--gray-700);}",
      ".oly-dash-chart{height:200px;display:flex;align-items:flex-end;gap:4px;padding:10px 0;}",
      ".oly-dash-chart-bar{background:var(--primary-color);border-radius:3px 3px 0 0;min-width:8px;flex:1;transition:height .4s ease;cursor:pointer;position:relative;}",
      ".oly-dash-chart-bar:hover{opacity:0.8;}",
      ".oly-dash-chart-bar[title]:hover::after{content:attr(title);position:absolute;bottom:100%;left:50%;transform:translateX(-50%);background:var(--gray-800);color:white;padding:4px 8px;border-radius:4px;font-size:0.7rem;white-space:nowrap;z-index:10;}",
      "@media(max-width:768px){.oly-dash-grid{grid-template-columns:1fr;}.oly-dash-cards{grid-template-columns:repeat(2,1fr);}}",
      "[data-theme='dark'] .oly-dash-table tr:hover td{background:var(--gray-800);}",
    ].join("\n");
    document.head.appendChild(s);
  }

  page.main.html('<div class="oly-dash" id="oly-dash"><div style="text-align:center;padding:60px;color:var(--text-muted);"><i class="fa fa-spinner fa-spin fa-2x"></i><p style="margin-top:12px;">Loading dashboard...</p></div></div>');

  var $dash = $("#oly-dash");

  page.set_primary_action(__("Refresh"), function () { load_dashboard(); }, "refresh");
  page.add_inner_button(__("AI Settings"), function () { frappe.set_route("Form", "AI Settings"); });
  page.add_inner_button(__("Ask AI"), function () { frappe.set_route("ask-ai"); });

  function fmt_cost(v) { return "$" + Number(v || 0).toFixed(4); }
  function fmt_num(v) { return Number(v || 0).toLocaleString(); }
  function fmt_pct(v) { return Number(v || 0).toFixed(1) + "%"; }

  function load_dashboard() {
    frappe.xcall("oly_ai.api.dashboard.get_dashboard_data").then(function (d) {
      render_dashboard(d);
    }).catch(function (err) {
      $dash.html('<div style="text-align:center;padding:60px;color:var(--red-500);">' +
        '<p style="font-size:1.2rem;font-weight:600;">Failed to load dashboard</p>' +
        '<p>' + (err.message || "Unknown error") + '</p></div>');
    });
  }

  function render_dashboard(d) {
    var s = d.summary;
    var budget_pct = Math.min(s.budget_used_pct, 100);
    var budget_color = budget_pct > 80 ? "var(--red-500)" : budget_pct > 50 ? "var(--yellow-600)" : "var(--green-500)";

    var html = "";

    // ── Summary Cards ──
    html += '<div class="oly-dash-cards">' +
      card("Requests Today", fmt_num(s.today_requests), "out of " + fmt_num(s.month_requests) + " this month", true) +
      card("Month Cost", fmt_cost(s.month_cost), fmt_cost(s.total_cost) + " total", true) +
      card("Active Users", fmt_num(s.active_users || 0), s.provider + " / " + s.model) +
      card("Avg Response", s.avg_response_time + "s", "Cache hit: " + s.cache_rate + "%") +
      card("Error Rate", fmt_pct(s.error_rate), fmt_num(s.input_tokens + s.output_tokens) + " tokens") +
      '<div class="oly-dash-card accent">' +
        '<div class="label">Budget Usage</div>' +
        '<div class="value">' + fmt_pct(budget_pct) + '</div>' +
        '<div class="oly-dash-bar"><div class="oly-dash-bar-fill" style="width:' + budget_pct + '%;background:' + budget_color + ';"></div></div>' +
        '<div class="sub" style="margin-top:4px;">' + fmt_cost(s.month_cost) + ' / ' + fmt_cost(s.monthly_budget) + '</div>' +
      '</div>' +
    '</div>';

    // ── Charts & Tables Grid ──
    html += '<div class="oly-dash-grid">';

    // Daily trend chart
    html += '<div class="oly-dash-section">' +
      '<h3>Daily Usage (Last 30 Days)</h3>' +
      render_chart(d.daily_trend) +
    '</div>';

    // Feature breakdown
    html += '<div class="oly-dash-section">' +
      '<h3>Usage by Feature</h3>' +
      render_feature_table(d.features) +
    '</div>';

    // Top users
    html += '<div class="oly-dash-section">' +
      '<h3>Top Users</h3>' +
      render_users_table(d.top_users) +
    '</div>';

    // Top doctypes
    html += '<div class="oly-dash-section">' +
      '<h3>Top DocTypes</h3>' +
      render_doctype_table(d.top_doctypes) +
    '</div>';

    html += '</div>'; // end grid

    // Recent logs
    html += '<div class="oly-dash-section">' +
      '<h3>Recent Activity</h3>' +
      render_logs_table(d.recent_logs) +
    '</div>';

    $dash.html(html);
  }

  function card(label, value, sub, accent) {
    return '<div class="oly-dash-card' + (accent ? " accent" : "") + '">' +
      '<div class="label">' + label + '</div>' +
      '<div class="value">' + value + '</div>' +
      '<div class="sub">' + (sub || "") + '</div></div>';
  }

  function render_chart(data) {
    if (!data || !data.length) return '<p style="color:var(--text-muted);text-align:center;">No data yet</p>';
    var max_val = Math.max.apply(null, data.map(function (d) { return d.count || 0; })) || 1;
    var bars = data.map(function (d) {
      var h = Math.max(4, Math.round((d.count / max_val) * 180));
      var label = d.date + ": " + d.count + " requests, " + fmt_cost(d.cost);
      return '<div class="oly-dash-chart-bar" style="height:' + h + 'px;" title="' + label + '"></div>';
    }).join("");
    return '<div class="oly-dash-chart">' + bars + '</div>';
  }

  function render_feature_table(data) {
    if (!data || !data.length) return '<p style="color:var(--text-muted);">No data</p>';
    var total = data.reduce(function (s, d) { return s + d.count; }, 0) || 1;
    return '<table class="oly-dash-table"><thead><tr><th>Feature</th><th>Requests</th><th>Cost</th><th>Share</th></tr></thead><tbody>' +
      data.map(function (d) {
        var pct = ((d.count / total) * 100).toFixed(1);
        return '<tr><td>' + (d.feature || "—") + '</td><td>' + fmt_num(d.count) + '</td><td>' + fmt_cost(d.cost) + '</td><td>' + pct + '%</td></tr>';
      }).join("") + '</tbody></table>';
  }

  function render_users_table(data) {
    if (!data || !data.length) return '<p style="color:var(--text-muted);">No data</p>';
    return '<table class="oly-dash-table"><thead><tr><th>User</th><th>Requests</th><th>Cost</th></tr></thead><tbody>' +
      data.map(function (d) {
        return '<tr><td>' + frappe.utils.escape_html(d.user) + '</td><td>' + fmt_num(d.count) + '</td><td>' + fmt_cost(d.cost) + '</td></tr>';
      }).join("") + '</tbody></table>';
  }

  function render_doctype_table(data) {
    if (!data || !data.length) return '<p style="color:var(--text-muted);">No data</p>';
    return '<table class="oly-dash-table"><thead><tr><th>DocType</th><th>Requests</th></tr></thead><tbody>' +
      data.map(function (d) {
        return '<tr><td>' + frappe.utils.escape_html(d.doctype || "—") + '</td><td>' + fmt_num(d.count) + '</td></tr>';
      }).join("") + '</tbody></table>';
  }

  function render_logs_table(data) {
    if (!data || !data.length) return '<p style="color:var(--text-muted);">No recent activity</p>';
    return '<table class="oly-dash-table"><thead><tr><th>Time</th><th>User</th><th>Feature</th><th>Model</th><th>Cost</th><th>Time</th><th>Status</th></tr></thead><tbody>' +
      data.map(function (d) {
        var badge_cls = d.status === "Success" ? "success" : d.status === "Cached" ? "success" : "error";
        var time_str = frappe.datetime.prettyDate(d.creation);
        return '<tr>' +
          '<td style="white-space:nowrap;">' + time_str + '</td>' +
          '<td>' + frappe.utils.escape_html(d.user || "") + '</td>' +
          '<td>' + frappe.utils.escape_html(d.feature || "") + '</td>' +
          '<td>' + frappe.utils.escape_html(d.model_used || "") + '</td>' +
          '<td>' + fmt_cost(d.estimated_cost_usd) + '</td>' +
          '<td>' + (d.response_time ? d.response_time + "s" : "—") + '</td>' +
          '<td><span class="oly-dash-badge ' + badge_cls + '">' + (d.status || "—") + '</span></td>' +
        '</tr>';
      }).join("") + '</tbody></table>';
  }

  load_dashboard();
};
