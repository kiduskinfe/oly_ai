# Copyright (c) 2026, OLY Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class AIWorkflow(Document):
	def validate(self):
		if not self.steps:
			frappe.throw("At least one step is required")

	@frappe.whitelist()
	def run(self):
		"""Execute this workflow."""
		from oly_ai.core.workflow_engine import execute_workflow
		return execute_workflow(self.name)

	@frappe.whitelist()
	def run_background(self):
		"""Execute this workflow in the background."""
		frappe.enqueue(
			"oly_ai.core.workflow_engine.execute_workflow",
			workflow_name=self.name,
			queue="long",
			timeout=300,
		)
		return {"status": "enqueued", "message": "Workflow execution started in background"}
