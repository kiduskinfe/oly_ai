frappe.pages["ai-usage-dashboard"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("AI Usage Dashboard"),
		single_column: true,
	});

	page.main.html(`<div class="ai-dashboard"><div class="ai-loading">
		<div class="spinner-border text-primary" role="status"></div>
		<p class="mt-3 text-muted">${__("Loading dashboard...")}</p>
	</div></div>`);

	// Add refresh button
	page.set_primary_action(__("Refresh"), () => load_dashboard(page), "refresh");

	// Add link to AI Settings
	page.add_inner_button(__("AI Settings"), () => {
		frappe.set_route("Form", "AI Settings");
	});

	page.add_inner_button(__("Audit Logs"), () => {
		frappe.set_route("List", "AI Audit Log");
	});

	load_dashboard(page);
};

function load_dashboard(page) {
	frappe.xcall("oly_ai.api.dashboard.get_dashboard_data").then((data) => {
		render_dashboard(page, data);
	}).catch((err) => {
		page.main.find(".ai-dashboard").html(
			`<div class="ai-error" style="margin:40px auto; max-width:500px;">
				<strong>${__("Error loading dashboard")}</strong><br>
				${err.message || __("Something went wrong")}
			</div>`
		);
	});
}

function render_dashboard(page, data) {
	const s = data.summary;
	const budget_color = s.budget_used_pct > 80 ? "var(--red-500)" : s.budget_used_pct > 50 ? "var(--yellow-500)" : "var(--green-500)";

	let html = `<div class="ai-dashboard">`;

	// Summary cards
	html += `<div class="ai-dashboard-grid">
		<div class="ai-stat-card">
			<div class="stat-value">${s.month_requests}</div>
			<div class="stat-label">Requests This Month</div>
			<div class="stat-sub">${s.today_requests} today • ${s.total_requests} total</div>
		</div>
		<div class="ai-stat-card">
			<div class="stat-value" style="color:${budget_color}">$${s.month_cost.toFixed(2)}</div>
			<div class="stat-label">Cost This Month</div>
			<div class="stat-sub">${s.budget_used_pct}% of $${s.monthly_budget} budget</div>
		</div>
		<div class="ai-stat-card">
			<div class="stat-value">${format_tokens(s.input_tokens + s.output_tokens)}</div>
			<div class="stat-label">Tokens This Month</div>
			<div class="stat-sub">${format_tokens(s.input_tokens)} in • ${format_tokens(s.output_tokens)} out</div>
		</div>
		<div class="ai-stat-card">
			<div class="stat-value">${s.cache_rate}%</div>
			<div class="stat-label">Cache Hit Rate</div>
			<div class="stat-sub">${s.avg_response_time}s avg response</div>
		</div>
	</div>`;

	// Budget progress bar
	html += `<div class="ai-dashboard-section">
		<h3>Budget</h3>
		<div style="display:flex; justify-content:space-between; margin-bottom:6px;">
			<span>$${s.month_cost.toFixed(4)} used</span>
			<span>$${s.monthly_budget} limit</span>
		</div>
		<div style="background:var(--border-color); border-radius:8px; height:12px; overflow:hidden;">
			<div style="background:${budget_color}; width:${Math.min(s.budget_used_pct, 100)}%; height:100%; border-radius:8px; transition:width 0.3s;"></div>
		</div>
		<div class="text-muted small mt-1">Provider: ${s.provider} • Model: ${s.model} • Error rate: ${s.error_rate}%</div>
	</div>`;

	// Feature breakdown
	if (data.features.length) {
		html += `<div class="ai-dashboard-section">
			<h3>Feature Usage</h3>
			<table class="table table-sm">
				<thead><tr><th>Feature</th><th class="text-right">Requests</th><th class="text-right">Cost</th></tr></thead>
				<tbody>`;
		data.features.forEach((f) => {
			html += `<tr><td>${f.feature}</td><td class="text-right">${f.count}</td><td class="text-right">$${parseFloat(f.cost).toFixed(4)}</td></tr>`;
		});
		html += `</tbody></table></div>`;
	}

	// Top users and doctypes side by side
	html += `<div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">`;

	if (data.top_users.length) {
		html += `<div class="ai-dashboard-section">
			<h3>Top Users</h3>
			<table class="table table-sm">
				<thead><tr><th>User</th><th class="text-right">Requests</th><th class="text-right">Cost</th></tr></thead>
				<tbody>`;
		data.top_users.forEach((u) => {
			html += `<tr><td>${u.user}</td><td class="text-right">${u.count}</td><td class="text-right">$${parseFloat(u.cost).toFixed(4)}</td></tr>`;
		});
		html += `</tbody></table></div>`;
	}

	if (data.top_doctypes.length) {
		html += `<div class="ai-dashboard-section">
			<h3>Top DocTypes</h3>
			<table class="table table-sm">
				<thead><tr><th>DocType</th><th class="text-right">Requests</th></tr></thead>
				<tbody>`;
		data.top_doctypes.forEach((d) => {
			html += `<tr><td>${d.doctype}</td><td class="text-right">${d.count}</td></tr>`;
		});
		html += `</tbody></table></div>`;
	}

	html += `</div>`;

	// Daily trend (simple text-based chart)
	if (data.daily_trend.length) {
		const max_count = Math.max(...data.daily_trend.map((d) => d.count), 1);
		html += `<div class="ai-dashboard-section">
			<h3>Daily Trend (Last 30 Days)</h3>
			<div style="display:flex; align-items:flex-end; gap:3px; height:120px; padding:10px 0;">`;
		data.daily_trend.forEach((d) => {
			const h = Math.max((d.count / max_count) * 100, 4);
			const date = frappe.datetime.str_to_user(d.date);
			html += `<div title="${date}: ${d.count} requests, $${parseFloat(d.cost).toFixed(4)}"
				style="flex:1; background:var(--primary); border-radius:3px 3px 0 0; height:${h}%; min-width:6px; cursor:help;"></div>`;
		});
		html += `</div></div>`;
	}

	// Recent logs
	if (data.recent_logs.length) {
		html += `<div class="ai-dashboard-section">
			<h3>Recent Activity</h3>
			<table class="table table-sm">
				<thead><tr><th>Time</th><th>User</th><th>Feature</th><th>DocType</th><th>Status</th><th class="text-right">Cost</th><th class="text-right">Time</th></tr></thead>
				<tbody>`;
		data.recent_logs.forEach((log) => {
			const status_color = log.status === "Success" ? "green" : log.status === "Cached" ? "blue" : "red";
			const time_ago = frappe.datetime.prettyDate(log.creation);
			html += `<tr>
				<td class="text-muted">${time_ago}</td>
				<td>${frappe.avatar(log.user, "avatar-xs")} ${log.user.split("@")[0]}</td>
				<td>${log.feature}</td>
				<td>${log.reference_doctype ? `<a href="/app/${frappe.router.slug(log.reference_doctype)}/${log.reference_name}">${log.reference_doctype}</a>` : "—"}</td>
				<td><span class="indicator-pill ${status_color}">${log.status}${log.cached ? " ⚡" : ""}</span></td>
				<td class="text-right">$${parseFloat(log.estimated_cost_usd || 0).toFixed(4)}</td>
				<td class="text-right">${log.response_time ? log.response_time + "s" : "—"}</td>
			</tr>`;
		});
		html += `</tbody></table></div>`;
	}

	html += `</div>`;
	page.main.html(html);
}

function format_tokens(n) {
	if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
	if (n >= 1000) return (n / 1000).toFixed(1) + "K";
	return n.toString();
}
