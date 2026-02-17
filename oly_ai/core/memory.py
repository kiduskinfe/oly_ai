# Copyright (c) 2026, OLY Technologies and contributors
# Conversation Memory — Smart context management for multi-turn conversations.
# Summarizes old messages to fit within token limits while preserving context.

import frappe
from frappe import _


# Max messages to keep in full detail
MAX_RECENT_MESSAGES = 16
# Trigger summarization after this many messages
SUMMARIZE_THRESHOLD = 24
# Max tokens for summary
SUMMARY_MAX_TOKENS = 500


def get_session_context(session):
	"""Build optimized conversation context for the LLM.

	Strategy:
	1. If session has a stored summary, include it as a system message
	2. Include the last N messages in full detail
	3. This keeps context rich while staying within token limits

	Args:
		session: AI Chat Session doc

	Returns:
		list: Message dicts for the LLM
	"""
	messages = session.messages or []

	if not messages:
		return []

	context = []

	# Include summary if available
	summary = session.get("conversation_summary")
	if summary:
		context.append({
			"role": "system",
			"content": f"Summary of earlier conversation:\n{summary}",
		})

	# Include recent messages in full
	recent = messages[-MAX_RECENT_MESSAGES:]
	for msg in recent:
		context.append({"role": msg.role, "content": msg.content})

	return context


def maybe_summarize_session(session):
	"""Summarize the session if it has too many messages.

	Called after each AI response. If the message count exceeds
	SUMMARIZE_THRESHOLD, summarizes the older messages and stores
	the summary on the session.

	Only summarizes messages NOT in the recent window.
	"""
	messages = session.messages or []

	if len(messages) < SUMMARIZE_THRESHOLD:
		return

	# Already has a recent summary and not grown too much since
	old_summary = session.get("conversation_summary") or ""
	messages_to_summarize = messages[:-MAX_RECENT_MESSAGES]

	if not messages_to_summarize:
		return

	# Build the text to summarize
	parts = []
	if old_summary:
		parts.append(f"Previous summary: {old_summary}")

	for msg in messages_to_summarize:
		role = msg.role.upper()
		content = (msg.content or "")[:500]  # Truncate long messages
		parts.append(f"{role}: {content}")

	text_to_summarize = "\n".join(parts)

	try:
		from oly_ai.core.provider import LLMProvider
		settings = frappe.get_cached_doc("AI Settings")
		provider = LLMProvider(settings)

		# Use a fast model for summarization
		summary_model = "gpt-4o-mini"

		result = provider.chat(
			messages=[
				{
					"role": "system",
					"content": "You are a conversation summarizer. Create a concise summary of the conversation that preserves key context, decisions, data points, and user preferences. Keep it under 300 words. Focus on what's important for continuing the conversation.",
				},
				{
					"role": "user",
					"content": f"Summarize this conversation:\n\n{text_to_summarize}",
				},
			],
			model=summary_model,
			max_tokens=SUMMARY_MAX_TOKENS,
		)

		summary = result.get("content", "")
		if summary:
			frappe.db.set_value(
				"AI Chat Session", session.name,
				"conversation_summary", summary,
				update_modified=False,
			)
			frappe.db.commit()

	except Exception as e:
		frappe.log_error(f"Session summarization failed: {e}", "AI Memory")
