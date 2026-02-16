# Copyright (c) 2026, OLY Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class AIChatSession(Document):
	def before_insert(self):
		"""Ensure the session is owned by the current user."""
		self.user = frappe.session.user

	def validate(self):
		if self.user != frappe.session.user and frappe.session.user != "Administrator":
			frappe.throw("You can only access your own chat sessions.")
