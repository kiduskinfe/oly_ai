# Copyright (c) 2026, OLY Technologies and contributors
# Response caching to reduce API costs by 60-80%

import hashlib
import json
import time

import frappe


def get_cache_key(messages, model, feature=""):
	"""Generate a deterministic cache key from messages + model."""
	content = json.dumps({"messages": messages, "model": model, "feature": feature}, sort_keys=True)
	return f"oly_ai:{hashlib.sha256(content.encode()).hexdigest()}"


def get_cached_response(messages, model, feature=""):
	"""Try to get a cached response. Returns None if not cached or expired."""
	settings = frappe.get_cached_doc("AI Settings")
	if not settings.enable_caching:
		return None

	cache_key = get_cache_key(messages, model, feature)
	cached = frappe.cache().get_value(cache_key)

	if cached:
		try:
			data = json.loads(cached)
			# Check TTL
			ttl_hours = settings.cache_ttl_hours or 0
			if ttl_hours > 0:
				cached_at = data.get("cached_at", 0)
				if time.time() - cached_at > ttl_hours * 3600:
					frappe.cache().delete_value(cache_key)
					return None
			return data.get("response")
		except (json.JSONDecodeError, KeyError):
			return None

	return None


def set_cached_response(messages, model, response, feature=""):
	"""Cache a response."""
	settings = frappe.get_cached_doc("AI Settings")
	if not settings.enable_caching:
		return

	cache_key = get_cache_key(messages, model, feature)
	ttl_hours = settings.cache_ttl_hours or 4

	data = {
		"response": response,
		"cached_at": time.time(),
	}

	# Store in Redis with TTL
	frappe.cache().set_value(
		cache_key,
		json.dumps(data),
		expires_in_sec=ttl_hours * 3600 if ttl_hours > 0 else None,
	)


def clear_cache():
	"""Clear all AI response caches."""
	# Clear by pattern
	keys = frappe.cache().get_keys("oly_ai:*")
	for key in keys:
		frappe.cache().delete_value(key)
	return len(keys)
