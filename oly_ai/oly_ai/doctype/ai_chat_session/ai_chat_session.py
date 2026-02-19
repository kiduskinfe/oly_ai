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
			# Allow shared users to read (but validation only fires on save)
			if not self._is_shared_with(frappe.session.user):
				frappe.throw("You can only access your own chat sessions.")

	def _is_shared_with(self, user):
		"""Check if a user has been shared this session."""
		for row in (self.shared_with or []):
			if row.user == user:
				return True
		return False
