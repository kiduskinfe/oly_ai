# Copyright (c) 2026, OLY Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class AISettings(Document):
	"""Singleton settings for Oly AI."""

	def validate(self):
		if self.temperature and (self.temperature < 0 or self.temperature > 2):
			frappe.throw("Temperature must be between 0 and 2")
		if self.top_p and (self.top_p < 0 or self.top_p > 1):
			frappe.throw("Top P must be between 0 and 1")
		if not self.default_model:
			frappe.throw("Default Model is required")

	def is_configured(self):
		"""Check if AI is properly configured with an API key."""
		try:
			api_key = self.get_password("api_key", raise_exception=False)
			return bool(api_key and self.default_model)
		except Exception:
			return False

	def get_base_url(self):
		"""Return the correct base URL for the selected provider."""
		if self.provider_type == "OpenAI":
			return self.base_url or "https://api.openai.com/v1"
		elif self.provider_type == "Anthropic":
			return self.base_url or "https://api.anthropic.com"
		else:
			# Custom / Self-hosted
			if not self.base_url:
				frappe.throw("Base URL is required for Custom provider type")
			return self.base_url

	@staticmethod
	def get_settings():
		"""Get cached AI settings."""
		return frappe.get_cached_doc("AI Settings")
