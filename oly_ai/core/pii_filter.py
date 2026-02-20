# Copyright (c) 2026, OLY Technologies and contributors
# PII Filter — Detect and mask personally identifiable information
# before sending to external AI providers.

import re

import frappe

# Patterns for common PII types
_PII_PATTERNS = {
	"credit_card": {
		"pattern": re.compile(r"\b(?:\d{4}[-\s]?){3}\d{4}\b"),
		"mask": "****-****-****-{last4}",
		"description": "Credit card number",
	},
	"ssn": {
		"pattern": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
		"mask": "***-**-****",
		"description": "Social Security Number",
	},
	"email_address": {
		"pattern": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),
		"mask": None,  # Emails are generally OK to send — only mask if configured
		"description": "Email address",
	},
	"phone": {
		"pattern": re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,3}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b"),
		"mask": None,  # Phones are generally OK — only mask if configured
		"description": "Phone number",
	},
	"bank_account": {
		"pattern": re.compile(r"\b\d{8,20}\b"),  # Very broad — only used in context
		"mask": "****{last4}",
		"description": "Bank account number",
	},
	"password_in_text": {
		"pattern": re.compile(r"(?:password|passwd|pwd|secret|api[_-]?key|token)\s*[:=]\s*\S+", re.IGNORECASE),
		"mask": "{field}=****",
		"description": "Password/secret in text",
	},
	"ethiopian_tin": {
		"pattern": re.compile(r"\bTIN[-:\s]+\d{10}\b", re.IGNORECASE),
		"mask": "TIN-**********",
		"description": "Ethiopian TIN",
	},
}

# Fields in Frappe documents that are sensitive by nature
SENSITIVE_FIELD_PATTERNS = {
	"password", "secret", "api_key", "token", "auth",
	"bank_account", "iban", "swift", "routing_number",
	"ssn", "social_security", "national_id", "tin",
	"credit_card", "card_number", "cvv", "expiry",
}


def mask_pii(text, mask_emails=False, mask_phones=False):
	"""Detect and mask PII in text before sending to AI providers.

	Args:
		text: Input text to scan
		mask_emails: Whether to mask email addresses (default: False — emails are common in ERP)
		mask_phones: Whether to mask phone numbers (default: False)

	Returns:
		tuple: (masked_text, detections) where detections is a list of what was found
	"""
	if not text or not isinstance(text, str):
		return text, []

	detections = []
	masked = text

	# Always mask credit cards
	cc_pattern = _PII_PATTERNS["credit_card"]["pattern"]
	for match in cc_pattern.finditer(masked):
		original = match.group()
		digits_only = re.sub(r"[-\s]", "", original)
		if len(digits_only) >= 13 and _is_valid_luhn(digits_only):
			last4 = digits_only[-4:]
			replacement = f"****-****-****-{last4}"
			masked = masked.replace(original, replacement, 1)
			detections.append({"type": "credit_card", "masked": True})

	# Always mask SSN-like patterns
	ssn_pattern = _PII_PATTERNS["ssn"]["pattern"]
	for match in ssn_pattern.finditer(masked):
		masked = masked.replace(match.group(), "***-**-****", 1)
		detections.append({"type": "ssn", "masked": True})

	# Always mask passwords/secrets in text
	pwd_pattern = _PII_PATTERNS["password_in_text"]["pattern"]
	for match in pwd_pattern.finditer(masked):
		original = match.group()
		# Extract the field name part
		field = re.split(r"[:=]", original)[0].strip()
		masked = masked.replace(original, f"{field}=****", 1)
		detections.append({"type": "password_in_text", "masked": True})

	# Always mask Ethiopian TIN
	tin_pattern = _PII_PATTERNS["ethiopian_tin"]["pattern"]
	for match in tin_pattern.finditer(masked):
		masked = masked.replace(match.group(), "TIN-**********", 1)
		detections.append({"type": "ethiopian_tin", "masked": True})

	# Optionally mask emails
	if mask_emails:
		email_pattern = _PII_PATTERNS["email_address"]["pattern"]
		for match in email_pattern.finditer(masked):
			email = match.group()
			parts = email.split("@")
			if len(parts) == 2:
				replacement = f"{parts[0][0]}***@{parts[1]}"
				masked = masked.replace(email, replacement, 1)
				detections.append({"type": "email", "masked": True})

	# Optionally mask phones
	if mask_phones:
		phone_pattern = _PII_PATTERNS["phone"]["pattern"]
		for match in phone_pattern.finditer(masked):
			phone = match.group()
			digits = re.sub(r"[^\d]", "", phone)
			if len(digits) >= 7:
				masked = masked.replace(phone, f"***-***-{digits[-4:]}", 1)
				detections.append({"type": "phone", "masked": True})

	return masked, detections


def mask_sensitive_fields(doc_data, doctype=None):
	"""Mask sensitive fields in document data before AI processing.

	Checks field names against known sensitive patterns and masks values.

	Args:
		doc_data: dict of document fields
		doctype: Optional doctype name for metadata-based detection

	Returns:
		tuple: (cleaned_data, masked_fields)
	"""
	if not isinstance(doc_data, dict):
		return doc_data, []

	cleaned = dict(doc_data)
	masked_fields = []

	# Check by field name pattern
	for key, value in doc_data.items():
		if not value or not isinstance(value, str):
			continue

		key_lower = key.lower()
		if any(pattern in key_lower for pattern in SENSITIVE_FIELD_PATTERNS):
			cleaned[key] = "****"
			masked_fields.append(key)

	# Check by Frappe field type if doctype provided
	if doctype:
		try:
			meta = frappe.get_meta(doctype)
			for field in meta.fields:
				if field.fieldtype == "Password" and field.fieldname in cleaned:
					cleaned[field.fieldname] = "****"
					if field.fieldname not in masked_fields:
						masked_fields.append(field.fieldname)
		except Exception:
			pass

	return cleaned, masked_fields


def filter_messages_pii(messages):
	"""Scan and mask PII in a list of chat messages before sending to provider.

	This is a pre-processing step applied to the messages array.

	Args:
		messages: List of message dicts (role/content format)

	Returns:
		tuple: (filtered_messages, total_detections)
	"""
	if not messages:
		return messages, 0

	filtered = []
	total_detections = 0

	for msg in messages:
		new_msg = dict(msg)

		content = msg.get("content", "")
		if isinstance(content, str) and content:
			masked_content, detections = mask_pii(content)
			new_msg["content"] = masked_content
			total_detections += len(detections)
		elif isinstance(content, list):
			# Multipart content (vision messages)
			new_parts = []
			for part in content:
				if isinstance(part, dict) and part.get("type") == "text":
					masked_text, detections = mask_pii(part.get("text", ""))
					new_parts.append({"type": "text", "text": masked_text})
					total_detections += len(detections)
				else:
					new_parts.append(part)
			new_msg["content"] = new_parts

		filtered.append(new_msg)

	return filtered, total_detections


def _is_valid_luhn(number_str):
	"""Luhn algorithm validation for credit card numbers."""
	try:
		digits = [int(d) for d in number_str]
		checksum = 0
		reverse_digits = digits[::-1]
		for i, d in enumerate(reverse_digits):
			if i % 2 == 1:
				d *= 2
				if d > 9:
					d -= 9
			checksum += d
		return checksum % 10 == 0
	except (ValueError, TypeError):
		return False
