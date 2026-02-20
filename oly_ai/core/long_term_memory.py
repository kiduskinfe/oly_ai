# Copyright (c) 2026, OLY Technologies and contributors
# Cross-Session Memory — Extract and inject persistent user memories across conversations.
#
# Flow:
#   1. After each AI response, extract_memories_from_session() analyzes the conversation
#      for new facts/preferences worth remembering.
#   2. On every new message, get_user_memories() retrieves active memories and injects
#      them into the system prompt so the AI "remembers" across sessions.
#   3. Users can view/delete memories via the AI User Memory doctype or the API.

import json

import frappe
from frappe import _
from frappe.utils import now_datetime


# ── Configuration ──────────────────────────────────────────────

# Max memories to inject into system prompt (keeps token cost low)
MAX_MEMORIES_IN_PROMPT = 30

# Minimum messages in a session before we attempt extraction
MIN_MESSAGES_FOR_EXTRACTION = 4

# Model used for memory extraction (cheap + fast)
EXTRACTION_MODEL = "gpt-4o-mini"

# Extraction prompt
EXTRACTION_SYSTEM_PROMPT = """You are a memory extraction assistant. Your job is to analyze a conversation between a user and an AI assistant and extract important facts, preferences, and instructions that should be remembered for future conversations.

Extract ONLY information that would be useful in future conversations. Focus on:
- **Preferences**: How the user likes responses formatted, language preferences, communication style
- **Facts**: User's name, role, department, team members, responsibilities
- **Instructions**: Standing orders like "always include cost estimates" or "remind me about X"
- **Context**: Business context like "we use SAP for inventory" or "our fiscal year starts in July"
- **Workflow**: Process knowledge like "purchase orders above 50k need CFO approval"

Rules:
- Each memory should be a single, self-contained sentence
- Do NOT extract trivial or one-time information (e.g., "user asked about sales report")
- Do NOT extract information that's already common knowledge about ERPNext
- Do NOT extract the AI's responses — only facts about the USER
- If there's nothing worth remembering, return an empty array
- Categorize each memory as: Preference, Fact, Instruction, Context, or Workflow

Return a JSON array of objects: [{"text": "...", "category": "..."}]
If nothing worth remembering, return: []"""


def get_user_memories(user=None, message_context=""):
	"""Retrieve active memories for a user, formatted for injection into the system prompt.

	If message_context is provided, memories are scored for relevance and
	only the most relevant are included (up to MAX_MEMORIES_IN_PROMPT).

	Args:
		user: User email. Defaults to current session user.
		message_context: The current user message, for relevance scoring.

	Returns:
		str: Formatted memory text for inclusion in system prompt, or empty string.
	"""
	user = user or frappe.session.user

	memories = frappe.get_all(
		"AI User Memory",
		filters={"user": user, "active": 1},
		fields=["name", "memory_text", "category"],
		order_by="modified desc",
		limit_page_length=100,  # fetch more, then filter by relevance
	)

	if not memories:
		return ""

	# Score and sort by relevance if context is provided
	if message_context and len(memories) > MAX_MEMORIES_IN_PROMPT:
		memories = _score_memories(memories, message_context)
	else:
		memories = memories[:MAX_MEMORIES_IN_PROMPT]

	# Update last_accessed timestamp (batch update, no save overhead)
	memory_names = [m.name for m in memories]
	if memory_names:
		frappe.db.sql(
			"""UPDATE `tabAI User Memory`
			SET last_accessed = %s
			WHERE name IN %s""",
			(now_datetime(), memory_names),
		)

	# Group by category for readability
	grouped = {}
	for m in memories:
		cat = m.category or "General"
		grouped.setdefault(cat, []).append(m.memory_text)

	parts = ["Here is what you remember about this user from previous conversations:"]
	for cat, items in grouped.items():
		parts.append(f"\n{cat}:")
		for item in items:
			parts.append(f"  - {item}")

	parts.append("\nUse these memories naturally — don't explicitly mention that you 'remember' unless the user asks.")

	return "\n".join(parts)


def _score_memories(memories, context):
	"""Score memories by keyword relevance to the current message context.

	Uses a simple TF-based scoring: count how many words in the memory
	also appear in the context. Memories with higher overlap rank first.
	Always includes Instruction and Preference category memories regardless
	of score (they're universally relevant).

	Args:
		memories: list of memory dicts
		context: the current user message string

	Returns:
		list: top N memories sorted by relevance
	"""
	import re as _re

	# Tokenize context into lowercase word set
	context_words = set(_re.findall(r'[a-z]{3,}', context.lower()))
	if not context_words:
		return memories[:MAX_MEMORIES_IN_PROMPT]

	scored = []
	always_include = []

	for m in memories:
		# Always include Instructions and Preferences — they're universal
		cat = (m.category or "").lower()
		if cat in ("instruction", "preference"):
			always_include.append(m)
			continue

		# Score by word overlap
		mem_words = set(_re.findall(r'[a-z]{3,}', (m.memory_text or "").lower()))
		overlap = len(context_words & mem_words)
		scored.append((overlap, m))

	# Sort by score descending
	scored.sort(key=lambda x: x[0], reverse=True)

	# Combine: always-include first, then top-scored
	remaining_slots = MAX_MEMORIES_IN_PROMPT - len(always_include)
	result = always_include + [m for _, m in scored[:max(remaining_slots, 0)]]

	return result[:MAX_MEMORIES_IN_PROMPT]


def extract_memories_from_session(session_name):
	"""Analyze a conversation and extract memorable facts/preferences.

	Called asynchronously after AI responses. Uses GPT-4o-mini to identify
	new memories from the conversation, deduplicates against existing ones,
	and stores them.

	Args:
		session_name: Name of the AI Chat Session to analyze.
	"""
	try:
		session = frappe.get_doc("AI Chat Session", session_name)
	except frappe.DoesNotExistError:
		return

	messages = session.messages or []
	if len(messages) < MIN_MESSAGES_FOR_EXTRACTION:
		return

	user = session.user

	# Collect the recent conversation (last 20 messages max for extraction)
	conversation_text = []
	for msg in messages[-20:]:
		role = "USER" if msg.role == "user" else "ASSISTANT"
		content = (msg.content or "")[:800]
		conversation_text.append(f"{role}: {content}")

	conv_str = "\n".join(conversation_text)

	# Get existing memories to avoid duplicates
	existing = frappe.get_all(
		"AI User Memory",
		filters={"user": user, "active": 1},
		fields=["memory_text"],
		limit_page_length=100,
	)
	existing_texts = [m.memory_text.lower().strip() for m in existing]

	# Build the dedup hint
	dedup_note = ""
	if existing_texts:
		dedup_note = (
			"\n\nThe user already has these memories stored (do NOT duplicate them):\n"
			+ "\n".join(f"- {t}" for t in existing_texts[:30])
		)

	try:
		from oly_ai.core.provider import LLMProvider

		settings = frappe.get_cached_doc("AI Settings")
		provider = LLMProvider(settings)

		result = provider.chat(
			messages=[
				{"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
				{
					"role": "user",
					"content": f"Analyze this conversation and extract memories:\n\n{conv_str}{dedup_note}",
				},
			],
			model=EXTRACTION_MODEL,
			max_tokens=500,
			json_mode=True,
		)

		content = (result.get("content") or "").strip()
		if not content:
			return

		# Parse JSON response
		# Handle cases where model wraps in markdown code block
		if content.startswith("```"):
			content = content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

		try:
			memories = json.loads(content)
		except json.JSONDecodeError:
			# Try to find JSON array in the response
			start = content.find("[")
			end = content.rfind("]")
			if start >= 0 and end > start:
				memories = json.loads(content[start : end + 1])
			else:
				return

		if not isinstance(memories, list):
			return

		# Store new memories
		created = 0
		for mem in memories:
			if not isinstance(mem, dict):
				continue
			text = (mem.get("text") or "").strip()
			category = (mem.get("category") or "Fact").strip()

			if not text or len(text) < 5:
				continue

			# Skip if too similar to an existing memory
			if _is_duplicate(text, existing_texts):
				continue

			# Validate category
			valid_categories = ["Preference", "Fact", "Instruction", "Context", "Workflow"]
			if category not in valid_categories:
				category = "Fact"

			doc = frappe.new_doc("AI User Memory")
			doc.user = user
			doc.memory_text = text
			doc.category = category
			doc.source_session = session_name
			doc.extracted_at = now_datetime()
			doc.active = 1
			doc.flags.ignore_permissions = True
			doc.insert()
			created += 1

			# Also add to existing_texts to prevent intra-batch duplicates
			existing_texts.append(text.lower().strip())

		if created:
			frappe.db.commit()

	except Exception as e:
		frappe.log_error(f"Memory extraction failed for session {session_name}: {e}", "AI Memory")


def _is_duplicate(new_text, existing_texts):
	"""Check if a new memory is too similar to existing ones.

	Uses simple substring/overlap matching — not perfect but good enough
	to prevent obvious duplicates without needing embeddings.
	"""
	new_lower = new_text.lower().strip()

	for existing in existing_texts:
		# Exact match
		if new_lower == existing:
			return True

		# One contains the other
		if new_lower in existing or existing in new_lower:
			return True

		# Word overlap > 70%
		new_words = set(new_lower.split())
		existing_words = set(existing.split())
		if new_words and existing_words:
			overlap = len(new_words & existing_words)
			min_len = min(len(new_words), len(existing_words))
			if min_len > 0 and overlap / min_len > 0.7:
				return True

	return False


@frappe.whitelist()
def get_my_memories():
	"""API endpoint: get all memories for the current user."""
	user = frappe.session.user
	memories = frappe.get_all(
		"AI User Memory",
		filters={"user": user},
		fields=["name", "memory_text", "category", "active", "extracted_at", "source_session"],
		order_by="modified desc",
		limit_page_length=100,
	)
	return memories


@frappe.whitelist()
def delete_memory(memory_name):
	"""API endpoint: delete a specific memory."""
	user = frappe.session.user
	doc = frappe.get_doc("AI User Memory", memory_name)
	if doc.user != user and user != "Administrator":
		frappe.throw(_("Access denied"))
	doc.flags.ignore_permissions = True
	doc.delete()
	frappe.db.commit()
	return {"success": True}


@frappe.whitelist()
def toggle_memory(memory_name, active):
	"""API endpoint: enable/disable a memory without deleting it."""
	user = frappe.session.user
	doc = frappe.get_doc("AI User Memory", memory_name)
	if doc.user != user and user != "Administrator":
		frappe.throw(_("Access denied"))
	doc.active = 1 if int(active) else 0
	doc.flags.ignore_permissions = True
	doc.save()
	frappe.db.commit()
	return {"success": True}


@frappe.whitelist()
def add_memory(text, category="Fact"):
	"""API endpoint: manually add a memory."""
	user = frappe.session.user
	if not text or not text.strip():
		frappe.throw(_("Memory text is required"))

	valid_categories = ["Preference", "Fact", "Instruction", "Context", "Workflow"]
	if category not in valid_categories:
		category = "Fact"

	doc = frappe.new_doc("AI User Memory")
	doc.user = user
	doc.memory_text = text.strip()
	doc.category = category
	doc.active = 1
	doc.extracted_at = now_datetime()
	doc.flags.ignore_permissions = True
	doc.insert()
	frappe.db.commit()
	return {"name": doc.name, "memory_text": doc.memory_text, "category": doc.category}


@frappe.whitelist()
def clear_all_memories():
	"""API endpoint: delete all memories for the current user."""
	user = frappe.session.user
	frappe.db.delete("AI User Memory", {"user": user})
	frappe.db.commit()
	return {"success": True}
