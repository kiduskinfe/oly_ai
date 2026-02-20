# Copyright (c) 2026, OLY Technologies and contributors
# Shared utilities used by both chat.py and stream.py to avoid duplication.


def is_model_unavailable_error(exc):
	"""Return True if exception indicates invalid/inaccessible model."""
	msg = str(exc).lower()
	if "model" not in msg:
		return False
	error_hints = [
		"does not exist",
		"do not have access",
		"not found",
		"invalid model",
		"unknown model",
		"not a chat model",
		"not supported",
		"did you mean",
		"decommissioned",
		"deprecated",
	]
	return any(h in msg for h in error_hints)


def get_fallback_model(requested_model, settings):
	"""Pick a fallback model when requested model is unavailable."""
	fallback = settings.default_model or "gpt-4o-mini"
	if fallback == requested_model:
		return None
	return fallback
