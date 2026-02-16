# Copyright (c) 2026, OLY Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class AIPromptTemplate(Document):
	def validate(self):
		if self.temperature_override and (self.temperature_override < 0 or self.temperature_override > 2):
			frappe.throw("Temperature must be between 0 and 2")

	@staticmethod
	def get_template(feature, doctype=None):
		"""Get the best matching prompt template for a feature + doctype combo."""
		# First try doctype-specific
		if doctype:
			template = frappe.db.get_value(
				"AI Prompt Template",
				{"feature": feature, "reference_doctype": doctype, "enabled": 1},
				"name",
			)
			if template:
				return frappe.get_doc("AI Prompt Template", template)

		# Fall back to global (no doctype)
		template = frappe.db.get_value(
			"AI Prompt Template",
			{"feature": feature, "reference_doctype": ["is", "not set"], "enabled": 1},
			"name",
		)
		if template:
			return frappe.get_doc("AI Prompt Template", template)

		return None
