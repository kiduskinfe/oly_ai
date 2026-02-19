// AI Settings — Client Script for Training Actions & Index Stats
frappe.ui.form.on("AI Settings", {
	refresh: function (frm) {
		// Render training actions
		render_training_actions(frm);
		// Load index stats
		load_index_stats(frm);
	},
});

function render_training_actions(frm) {
	var $container = $(frm.fields_dict.training_actions.wrapper).find("#ai-training-actions");
	if (!$container.length) {
		$container = $(frm.fields_dict.training_actions.wrapper);
		$container.html('<div id="ai-training-actions"></div>');
		$container = $container.find("#ai-training-actions");
	}

	$container.html(
		'<div style="display:flex;gap:10px;flex-wrap:wrap;margin:8px 0;">' +
			'<button class="btn btn-success btn-sm" id="btn-discover" title="Auto-discover all DocTypes with data and add them to the index table">' +
				'<i class="fa fa-search-plus"></i> Discover All DocTypes' +
			"</button>" +
			'<button class="btn btn-primary btn-sm" id="btn-index-all">' +
				'<i class="fa fa-bolt"></i> Index All Selected DocTypes' +
			"</button>" +
			'<button class="btn btn-default btn-sm" id="btn-refresh-stats">' +
				'<i class="fa fa-refresh"></i> Refresh Stats' +
			"</button>" +
			'<button class="btn btn-danger btn-sm" id="btn-clear-index">' +
				'<i class="fa fa-trash"></i> Clear All Index Data' +
			"</button>" +
		"</div>"
	);

	$container.find("#btn-discover").on("click", function () {
		frappe.confirm(
			__(
				"This will scan your entire system for DocTypes with data and add them to the indexing table. " +
				"DocTypes already in the table will be skipped. Continue?"
			),
			function () {
				frappe.show_progress(__("Discovering..."), 0, 100, __("Scanning all DocTypes..."));
				frappe.xcall("oly_ai.api.train.discover_doctypes").then(function (r) {
					frappe.hide_progress();
					var msg = "<strong>" + r.discovered + "</strong> DocType(s) with data found.<br>";
					msg += "<strong>" + r.added + "</strong> new DocType(s) added to the index table.<br>";
					if (r.already_present > 0) {
						msg += "<strong>" + r.already_present + "</strong> were already in the table.";
					}
					if (r.added > 0) {
						msg += "<br><br><strong>New DocTypes added:</strong><br>";
						msg += r.added_names.map(function (n) { return "• " + n; }).join("<br>");
					}

					frm.reload_doc();

					if (r.added > 0) {
						frappe.confirm(
							msg + "<br><br><strong>Would you like to index all discovered DocTypes now?</strong><br>" +
							"<small>This may take several minutes and will use embedding API credits.</small>",
							function () {
								// Reload to get fresh doc with new rows, then index all
								frm.reload_doc(function () {
									var doctypes = (frm.doc.indexed_doctypes || [])
										.filter(function (d) { return d.enabled; })
										.map(function (d) { return d.document_type; });
									if (doctypes.length) {
										frappe.show_progress(__("Indexing..."), 0, doctypes.length);
										index_doctypes_sequential(frm, doctypes, 0);
									}
								});
							},
							function () {
								frappe.show_alert({
									message: __("DocTypes added. Click 'Index All Selected DocTypes' when ready."),
									indicator: "blue"
								});
							}
						);
					} else {
						frappe.msgprint({
							title: __("Discovery Complete"),
							message: msg,
							indicator: "blue",
						});
					}
				}).catch(function (err) {
					frappe.hide_progress();
					frappe.msgprint({
						title: __("Discovery Failed"),
						message: err.message || __("An error occurred during discovery."),
						indicator: "red",
					});
				});
			}
		);
	});

	$container.find("#btn-index-all").on("click", function () {
		var doctypes = (frm.doc.indexed_doctypes || [])
			.filter(function (d) { return d.enabled; })
			.map(function (d) { return d.document_type; });

		if (!doctypes.length) {
			frappe.msgprint(__("No DocTypes selected for indexing. Add rows to the DocTypes to Index table first."));
			return;
		}

		frappe.confirm(
			__("Index {0} DocType(s)? This may take a few minutes and will use embedding API credits.", [doctypes.length]),
			function () {
				frappe.show_progress(__("Indexing..."), 0, doctypes.length);
				index_doctypes_sequential(frm, doctypes, 0);
			}
		);
	});

	$container.find("#btn-refresh-stats").on("click", function () {
		load_index_stats(frm);
	});

	$container.find("#btn-clear-index").on("click", function () {
		frappe.confirm(
			__("This will delete ALL indexed data. The AI will lose all trained knowledge. Continue?"),
			function () {
				frappe.xcall("oly_ai.api.train.clear_all_index_data").then(function (r) {
					frappe.show_alert({ message: __("Cleared {0} index entries", [r.deleted]), indicator: "green" });
					load_index_stats(frm);
				});
			}
		);
	});
}

function index_doctypes_sequential(frm, doctypes, idx) {
	if (idx >= doctypes.length) {
		frappe.hide_progress();
		frappe.show_alert({ message: __("Indexing complete!"), indicator: "green" });
		load_index_stats(frm);
		frm.reload_doc();
		return;
	}

	var dt = doctypes[idx];
	frappe.show_progress(__("Indexing..."), idx, doctypes.length, __("Indexing {0}...", [dt]));

	frappe.xcall("oly_ai.api.train.index_doctype_full", { doctype: dt })
		.then(function (r) {
			frappe.show_alert({
				message: __("{0}: {1} indexed, {2} skipped, {3} errors", [dt, r.indexed, r.skipped, r.errors]),
				indicator: r.errors > 0 ? "orange" : "green",
			});
			index_doctypes_sequential(frm, doctypes, idx + 1);
		})
		.catch(function (err) {
			frappe.show_alert({ message: __("Error indexing {0}: {1}", [dt, err.message]), indicator: "red" });
			index_doctypes_sequential(frm, doctypes, idx + 1);
		});
}

function load_index_stats(frm) {
	var $container = $(frm.fields_dict.index_stats_html.wrapper).find("#ai-index-stats");
	if (!$container.length) {
		$container = $(frm.fields_dict.index_stats_html.wrapper);
		$container.html('<div id="ai-index-stats"></div>');
		$container = $container.find("#ai-index-stats");
	}

	$container.html('<div style="color:var(--text-muted);padding:12px;"><i class="fa fa-spinner fa-spin"></i> Loading index stats...</div>');

	frappe.xcall("oly_ai.api.train.get_index_stats").then(function (stats) {
		if (!stats || !stats.total_chunks) {
			$container.html(
				'<div class="alert alert-warning" style="margin:8px 0;">' +
					'<strong>No data indexed yet.</strong> Add DocTypes to the table above and click "Index All Selected DocTypes" to start training the AI.' +
				"</div>"
			);
			return;
		}

		var html = '<div style="margin:8px 0;">';
		html += '<div class="alert alert-info" style="margin-bottom:12px;">';
		html += "<strong>" + stats.total_chunks + "</strong> total chunks indexed across <strong>" + stats.doctypes.length + "</strong> DocType(s)";
		html += "</div>";
		html += '<table class="table table-bordered table-sm" style="font-size:0.85rem;">';
		html += "<thead><tr><th>DocType</th><th>Documents</th><th>Chunks</th></tr></thead><tbody>";
		stats.doctypes.forEach(function (d) {
			html += "<tr><td>" + d.doctype + "</td><td>" + d.docs + "</td><td>" + d.chunks + "</td></tr>";
		});
		html += "</tbody></table></div>";

		$container.html(html);
	}).catch(function () {
		$container.html('<div class="alert alert-danger">Failed to load index statistics.</div>');
	});
}
