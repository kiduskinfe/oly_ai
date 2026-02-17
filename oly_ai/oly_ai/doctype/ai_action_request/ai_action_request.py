# Copyright (c) 2026, OLY Technologies and contributors
# For license information, please see license.txt

import json
import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime


class AIActionRequest(Document):
	def validate(self):
		if self.action_data:
			try:
				json.loads(self.action_data)
			except json.JSONDecodeError:
				frappe.throw(_("Action Data must be valid JSON"))

	def after_insert(self):
		"""Send notification when action request is created."""
		try:
			from oly_ai.core.notifications import notify_action_request
			notify_action_request(self)
		except Exception:
			pass

	def on_update(self):
		"""Send notification when status changes."""
		if self.has_value_changed("status") and self.status in ("Executed", "Rejected", "Failed"):
			try:
				from oly_ai.core.notifications import notify_action_result
				notify_action_result(self, self.status)
			except Exception:
				pass

	def execute(self):
		"""Execute the approved action."""
		if self.status != "Approved":
			frappe.throw(_("Only approved actions can be executed"))

		try:
			data = json.loads(self.action_data) if self.action_data else {}

			if self.action_type == "Create Document":
				result = self._execute_create(data)
			elif self.action_type == "Update Document":
				result = self._execute_update(data)
			elif self.action_type == "Submit Document":
				result = self._execute_submit()
			elif self.action_type == "Cancel Document":
				result = self._execute_cancel()
			elif self.action_type == "Delete Document":
				result = self._execute_delete()
			elif self.action_type == "Send Communication":
				result = self._execute_send_communication(data)
			elif self.action_type == "Add Comment":
				result = self._execute_add_comment(data)
			else:
				frappe.throw(_(f"Unsupported action type: {self.action_type}"))

			self.status = "Executed"
			self.result_message = result
			self.executed_at = now_datetime()
			self.save(ignore_permissions=True)
			frappe.db.commit()
			return {"status": "success", "message": result}

		except Exception as e:
			self.status = "Failed"
			self.error_message = str(e)
			self.save(ignore_permissions=True)
			frappe.db.commit()
			return {"status": "error", "message": str(e)}

	def _execute_create(self, data):
		"""Create a new document."""
		if not self.target_doctype:
			frappe.throw(_("Target DocType is required for Create"))

		# Permission check
		if not frappe.has_permission(self.target_doctype, "create"):
			frappe.throw(_("No permission to create {0}").format(self.target_doctype))

		doc = frappe.new_doc(self.target_doctype)
		fields = data.get("fields", data)
		for key, value in fields.items():
			if hasattr(doc, key):
				setattr(doc, key, value)

		doc.insert()
		self.target_name = doc.name
		return f"Created {self.target_doctype}: {doc.name}"

	def _execute_update(self, data):
		"""Update an existing document."""
		if not self.target_doctype or not self.target_name:
			frappe.throw(_("Target DocType and Name required for Update"))

		if not frappe.has_permission(self.target_doctype, "write", self.target_name):
			frappe.throw(_("No permission to update {0} {1}").format(
				self.target_doctype, self.target_name
			))

		doc = frappe.get_doc(self.target_doctype, self.target_name)
		fields = data.get("fields", data)
		for key, value in fields.items():
			if hasattr(doc, key):
				setattr(doc, key, value)

		doc.save()
		return f"Updated {self.target_doctype}: {self.target_name}"

	def _execute_submit(self):
		"""Submit a document."""
		if not self.target_doctype or not self.target_name:
			frappe.throw(_("Target DocType and Name required"))

		if not frappe.has_permission(self.target_doctype, "submit", self.target_name):
			frappe.throw(_("No permission to submit {0} {1}").format(
				self.target_doctype, self.target_name
			))

		doc = frappe.get_doc(self.target_doctype, self.target_name)
		doc.submit()
		return f"Submitted {self.target_doctype}: {self.target_name}"

	def _execute_cancel(self):
		"""Cancel a document."""
		if not self.target_doctype or not self.target_name:
			frappe.throw(_("Target DocType and Name required"))

		if not frappe.has_permission(self.target_doctype, "cancel", self.target_name):
			frappe.throw(_("No permission to cancel {0} {1}").format(
				self.target_doctype, self.target_name
			))

		doc = frappe.get_doc(self.target_doctype, self.target_name)
		doc.cancel()
		return f"Cancelled {self.target_doctype}: {self.target_name}"

	def _execute_delete(self):
		"""Delete a document."""
		if not self.target_doctype or not self.target_name:
			frappe.throw(_("Target DocType and Name required"))

		if not frappe.has_permission(self.target_doctype, "delete", self.target_name):
			frappe.throw(_("No permission to delete {0} {1}").format(
				self.target_doctype, self.target_name
			))

		frappe.delete_doc(self.target_doctype, self.target_name)
		return f"Deleted {self.target_doctype}: {self.target_name}"

	def _execute_send_communication(self, data):
		"""Send a communication (email/message) linked to a document."""
		if not self.target_doctype or not self.target_name:
			frappe.throw(_("Target DocType and Name required for Send Communication"))

		if not frappe.has_permission(self.target_doctype, "read", self.target_name):
			frappe.throw(_("No permission to access {0} {1}").format(
				self.target_doctype, self.target_name
			))

		content = data.get("content", "")
		subject = data.get("subject", f"Re: {self.target_doctype} {self.target_name}")
		recipients = data.get("recipients", "")
		cc = data.get("cc", "")
		send_email = data.get("send_email", True)
		comm_type = data.get("communication_type", "Communication")

		# Create Communication record
		comm = frappe.new_doc("Communication")
		comm.communication_type = comm_type
		comm.subject = subject
		comm.content = content
		comm.reference_doctype = self.target_doctype
		comm.reference_name = self.target_name
		comm.sender = frappe.session.user
		comm.sent_or_received = "Sent"
		comm.communication_medium = "Email" if send_email else "Other"

		if recipients:
			comm.recipients = recipients

		if cc:
			comm.cc = cc

		comm.insert(ignore_permissions=True)

		# Actually send email if requested
		if send_email and recipients:
			try:
				frappe.sendmail(
					recipients=recipients.split(","),
					cc=cc.split(",") if cc else None,
					subject=subject,
					message=content,
					reference_doctype=self.target_doctype,
					reference_name=self.target_name,
					communication=comm.name,
				)
				return f"Email sent to {recipients} for {self.target_doctype} {self.target_name} (Communication: {comm.name})"
			except Exception as e:
				return f"Communication created ({comm.name}) but email sending failed: {str(e)}"

		return f"Communication recorded for {self.target_doctype} {self.target_name} (Communication: {comm.name})"

	def _execute_add_comment(self, data):
		"""Add a comment to a document."""
		if not self.target_doctype or not self.target_name:
			frappe.throw(_("Target DocType and Name required for Add Comment"))

		if not frappe.has_permission(self.target_doctype, "read", self.target_name):
			frappe.throw(_("No permission to access {0} {1}").format(
				self.target_doctype, self.target_name
			))

		comment_text = data.get("comment", "")
		if not comment_text:
			frappe.throw(_("Comment text is required"))

		# Add comment via Frappe's built-in comment system
		comment = frappe.get_doc(self.target_doctype, self.target_name).add_comment(
			"Comment",
			text=f"[AI Assistant] {comment_text}",
		)

		return f"Comment added to {self.target_doctype} {self.target_name} (Comment: {comment.name})"
