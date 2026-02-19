# Copyright (c) 2026, OLY Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class AIUserMemory(Document):
	def before_insert(self):
		"""Ensure the memory belongs to a valid user."""
		if not self.user:
			self.user = frappe.session.user

	def validate(self):
		# Non-admins can only manage their own memories
		if self.user != frappe.session.user and frappe.session.user != "Administrator":
			frappe.throw("You can only manage your own memories.")
