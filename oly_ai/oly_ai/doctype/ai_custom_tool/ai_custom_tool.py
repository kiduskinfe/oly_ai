# Copyright (c) 2026, OLY Technologies and contributors
# For license information, please see license.txt

import json
import frappe
from frappe import _
from frappe.model.document import Document


class AICustomTool(Document):
	def validate(self):
		# Validate tool_name is snake_case
		import re
		if not re.match(r'^[a-z][a-z0-9_]*$', self.tool_name):
			frappe.throw(_("Tool Name must be in snake_case (lowercase letters, numbers, underscores)"))

		# Validate parameters JSON
		if self.parameters_json:
			try:
				params = json.loads(self.parameters_json)
				if not isinstance(params, dict):
					frappe.throw(_("Parameters must be a JSON object"))
			except json.JSONDecodeError as e:
				frappe.throw(_("Invalid JSON in parameters: {0}").format(str(e)))

		# Validate handler
		if self.handler_type == "Python Module":
			if not self.python_module or not self.python_function:
				frappe.throw(_("Python Module and Function Name are required for Python Module handler type"))
		elif self.handler_type == "Server Script":
			if not self.server_script:
				frappe.throw(_("Server Script code is required for Server Script handler type"))

	def get_tool_definition(self):
		"""Return OpenAI function-calling tool definition."""
		params = {"type": "object", "properties": {}}
		if self.parameters_json:
			try:
				params = json.loads(self.parameters_json)
			except json.JSONDecodeError:
				pass

		return {
			"type": "function",
			"function": {
				"name": self.tool_name,
				"description": self.description,
				"parameters": params,
			},
		}

	def execute(self, args, user=None):
		"""Execute this custom tool.

		Args:
			args: Dict of arguments from the LLM
			user: The requesting user

		Returns:
			dict: Result of tool execution
		"""
		user = user or frappe.session.user

		# Role check
		if self.allowed_roles:
			allowed = [r.strip() for r in self.allowed_roles.split(",") if r.strip()]
			if allowed:
				user_roles = frappe.get_roles(user)
				if not any(r in user_roles for r in allowed):
					return {"error": f"Access denied: you need one of these roles: {', '.join(allowed)}"}

		if self.handler_type == "Python Module":
			return self._execute_python_module(args, user)
		elif self.handler_type == "Server Script":
			return self._execute_server_script(args, user)
		else:
			return {"error": f"Unknown handler type: {self.handler_type}"}

	def _execute_python_module(self, args, user):
		"""Execute a Python module function."""
		try:
			module = frappe.get_module(self.python_module)
			fn = getattr(module, self.python_function, None)
			if not fn:
				return {"error": f"Function '{self.python_function}' not found in module '{self.python_module}'"}
			result = fn(args=args, user=user)
			return result if isinstance(result, dict) else {"result": str(result)}
		except Exception as e:
			frappe.log_error(f"Custom tool error {self.tool_name}: {e}", "AI Custom Tool")
			return {"error": str(e)}

	def _execute_server_script(self, args, user):
		"""Execute inline server script."""
		try:
			local_vars = {"args": args, "user": user, "frappe": frappe, "result": None}
			exec(self.server_script, {"__builtins__": frappe.safe_eval.__builtins__ if hasattr(frappe, 'safe_eval') else {}}, local_vars)
			result = local_vars.get("result")
			return result if isinstance(result, dict) else {"result": str(result) if result else "Done"}
		except Exception as e:
			frappe.log_error(f"Custom tool script error {self.tool_name}: {e}", "AI Custom Tool")
			return {"error": str(e)}
