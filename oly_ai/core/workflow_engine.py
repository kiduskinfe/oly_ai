# Copyright (c) 2026, OLY Technologies and contributors
# Workflow Engine — Executes multi-step AI workflows
# Supports: AI queries, data queries, document operations, email, conditionals

import json
import re
import time

import frappe
from frappe import _
from frappe.utils import now_datetime


def execute_workflow(workflow_name):
	"""Execute an AI Workflow by running all its steps in sequence.

	Each step can reference previous step outputs using {{variable_name}}.

	Args:
		workflow_name: Name of the AI Workflow doc

	Returns:
		dict: {"status", "results", "total_time"}
	"""
	workflow = frappe.get_doc("AI Workflow", workflow_name)
	start_time = time.time()

	# Track step outputs for variable substitution
	context = {}
	results = []
	all_success = True

	workflow.status = "Active"
	workflow.last_run = now_datetime()
	workflow.error_message = ""
	workflow.flags.ignore_permissions = True
	workflow.save()
	frappe.db.commit()

	for step in workflow.steps:
		step.status = "Running"
		step.result = ""
		workflow.flags.ignore_permissions = True
		workflow.save()
		frappe.db.commit()

		try:
			result = _execute_step(step, context, workflow)
			step.status = "Completed"
			step.result = str(result)[:10000]  # Truncate if too long

			# Store output variable
			var_name = step.output_variable or f"step_{step.idx}"
			context[var_name] = result

			results.append({
				"step": step.idx,
				"type": step.step_type,
				"status": "Completed",
				"output_var": var_name,
				"result_preview": str(result)[:200],
			})

		except Exception as e:
			step.status = "Failed"
			step.result = str(e)
			all_success = False

			results.append({
				"step": step.idx,
				"type": step.step_type,
				"status": "Failed",
				"error": str(e),
			})

			# Stop on failure
			workflow.error_message = f"Step {step.idx} ({step.step_type}) failed: {e}"
			break

	total_time = round(time.time() - start_time, 2)

	workflow.status = "Completed" if all_success else "Failed"
	workflow.run_count = (workflow.run_count or 0) + 1
	workflow.last_result = json.dumps(results, default=str, indent=2)[:20000]
	workflow.flags.ignore_permissions = True
	workflow.save()
	frappe.db.commit()

	# Send notification
	try:
		from oly_ai.core.notifications import notify_workflow_complete
		notify_workflow_complete(workflow, results, all_success)
	except Exception:
		pass

	return {
		"status": "success" if all_success else "failed",
		"results": results,
		"total_time": total_time,
	}


def _execute_step(step, context, workflow):
	"""Execute a single workflow step.

	Args:
		step: AI Workflow Step row
		context: dict of previous step outputs
		workflow: Parent AI Workflow doc

	Returns:
		str: Step result/output
	"""
	step_type = step.step_type

	# Resolve variables in prompt and filters
	prompt = _resolve_variables(step.prompt or "", context)
	filters_json = _resolve_variables(step.target_filters or "{}", context)

	if step_type == "AI Query":
		return _step_ai_query(prompt, step.model, workflow)

	elif step_type == "Data Query":
		return _step_data_query(step.target_doctype, filters_json)

	elif step_type == "Data Aggregation":
		return _step_data_aggregation(step.target_doctype, filters_json, prompt)

	elif step_type == "Send Email":
		return _step_send_email(prompt, filters_json, context)

	elif step_type == "Create Document":
		return _step_create_document(step.target_doctype, filters_json)

	elif step_type == "Update Document":
		return _step_update_document(step.target_doctype, filters_json)

	elif step_type == "Conditional":
		return _step_conditional(prompt, context)

	elif step_type == "Delay":
		seconds = int(prompt or "5")
		time.sleep(min(seconds, 60))
		return f"Waited {seconds} seconds"

	else:
		raise ValueError(f"Unknown step type: {step_type}")


def _resolve_variables(text, context):
	"""Replace {{variable}} placeholders with context values."""
	def replacer(match):
		var_name = match.group(1).strip()
		if var_name in context:
			val = context[var_name]
			return str(val) if not isinstance(val, str) else val
		return match.group(0)  # Leave unchanged if not found

	return re.sub(r"\{\{(\w+)\}\}", replacer, text)


def _step_ai_query(prompt, model_override, workflow):
	"""Run an AI query and return the response."""
	from oly_ai.core.provider import LLMProvider

	settings = frappe.get_cached_doc("AI Settings")
	provider = LLMProvider(settings)

	model = model_override or settings.default_model

	result = provider.chat(
		messages=[
			{"role": "system", "content": "You are an AI analyst. Provide clear, concise responses."},
			{"role": "user", "content": prompt},
		],
		model=model,
	)

	# Track cost
	from oly_ai.core.cost_tracker import track_usage
	track_usage(model, result.get("tokens_input", 0), result.get("tokens_output", 0))

	return result.get("content", "")


def _step_data_query(doctype, filters_json):
	"""Query ERPNext data and return results."""
	if not doctype:
		raise ValueError("Target DocType is required for Data Query")

	try:
		filters = json.loads(filters_json) if filters_json else {}
	except json.JSONDecodeError:
		filters = {}

	results = frappe.get_list(
		doctype,
		filters=filters,
		fields=["*"],
		limit=50,
	)

	return json.dumps(results, default=str, indent=2)


def _step_data_aggregation(doctype, filters_json, prompt):
	"""Aggregate data and return summary."""
	if not doctype:
		raise ValueError("Target DocType is required for Data Aggregation")

	try:
		config = json.loads(filters_json) if filters_json else {}
	except json.JSONDecodeError:
		config = {}

	group_by = config.get("group_by", "status")
	aggregate_field = config.get("aggregate_field")
	filters = config.get("filters", {})

	agg_expr = ""
	if aggregate_field:
		agg_expr = f", SUM(`{aggregate_field}`) as total, AVG(`{aggregate_field}`) as average"

	conditions = "WHERE 1=1"
	values = []
	for key, val in filters.items():
		conditions += f" AND `{key}` = %s"
		values.append(val)

	sql = f"""
		SELECT `{group_by}` as group_value, COUNT(*) as count {agg_expr}
		FROM `tab{doctype}`
		{conditions}
		GROUP BY `{group_by}`
		ORDER BY count DESC
		LIMIT 50
	"""

	results = frappe.db.sql(sql, values, as_dict=True)
	return json.dumps(results, default=str, indent=2)


def _step_send_email(subject, config_json, context):
	"""Send an email with AI-generated content."""
	try:
		config = json.loads(config_json) if config_json else {}
	except json.JSONDecodeError:
		config = {}

	recipients = config.get("recipients", [])
	if isinstance(recipients, str):
		recipients = [r.strip() for r in recipients.split(",")]

	if not recipients:
		raise ValueError("No recipients specified for email")

	body = config.get("body", "")

	# If body references a context variable, resolve it
	body = _resolve_variables(body, context)

	frappe.sendmail(
		recipients=recipients,
		subject=subject or "AI Workflow Report",
		message=body,
		now=True,
	)

	return f"Email sent to {', '.join(recipients)}"


def _step_create_document(doctype, data_json):
	"""Create a new document."""
	if not doctype:
		raise ValueError("Target DocType is required")

	try:
		data = json.loads(data_json) if data_json else {}
	except json.JSONDecodeError:
		raise ValueError("Invalid JSON for document data")

	doc = frappe.new_doc(doctype)
	for key, value in data.items():
		if hasattr(doc, key):
			setattr(doc, key, value)

	doc.insert()
	frappe.db.commit()
	return f"Created {doctype}: {doc.name}"


def _step_update_document(doctype, data_json):
	"""Update an existing document."""
	if not doctype:
		raise ValueError("Target DocType is required")

	try:
		data = json.loads(data_json) if data_json else {}
	except json.JSONDecodeError:
		raise ValueError("Invalid JSON for document data")

	name = data.pop("name", None)
	if not name:
		raise ValueError("Document 'name' is required in the data for update")

	doc = frappe.get_doc(doctype, name)
	for key, value in data.items():
		if hasattr(doc, key):
			setattr(doc, key, value)

	doc.save()
	frappe.db.commit()
	return f"Updated {doctype}: {doc.name}"


def _step_conditional(condition, context):
	"""Evaluate a condition and return result."""
	# Simple condition evaluation using context variables
	try:
		import ast
		# Resolve variables in condition
		resolved = _resolve_variables(condition, context)
		# Safe evaluation using ast.literal_eval for simple expressions,
		# or compile + restricted eval for comparisons
		node = ast.parse(resolved, mode="eval")
		# Only allow safe node types (no calls, imports, attribute access)
		for child in ast.walk(node):
			if isinstance(child, (ast.Call, ast.Import, ast.ImportFrom,
					ast.Attribute, ast.Lambda, ast.ListComp, ast.SetComp,
					ast.DictComp, ast.GeneratorExp)):
				return f"Condition contains disallowed expression: {type(child).__name__}"
		code = compile(node, "<condition>", "eval")
		result = bool(eval(code, {"__builtins__": {}}, context))
		return f"Condition evaluated to: {result}"
	except Exception as e:
		return f"Condition evaluation failed: {e}"


def run_scheduled_workflows():
	"""Scheduled task: run workflows that are due.

	Checks active scheduled workflows and runs them if their
	cron schedule matches the current time.
	"""
	from croniter import croniter
	from datetime import datetime

	now = datetime.now()

	workflows = frappe.get_all(
		"AI Workflow",
		filters={"status": "Active", "trigger_type": "Scheduled"},
		fields=["name", "schedule", "next_run"],
	)

	for wf in workflows:
		if not wf.schedule:
			continue

		try:
			cron = croniter(wf.schedule, now)
			should_run = False

			if wf.next_run:
				should_run = now >= wf.next_run
			else:
				should_run = True

			if should_run:
				# Calculate next run
				next_run = cron.get_next(datetime)
				frappe.db.set_value("AI Workflow", wf.name, "next_run", next_run)
				frappe.db.commit()

				# Execute in background
				frappe.enqueue(
					"oly_ai.core.workflow_engine.execute_workflow",
					workflow_name=wf.name,
					queue="long",
					timeout=300,
				)

		except Exception as e:
			frappe.log_error(f"Scheduled workflow error {wf.name}: {e}", "AI Workflow")
