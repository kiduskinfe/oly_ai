# Copyright (c) 2026, OLY Technologies and contributors
# RAG Retriever — Finds the most relevant document chunks for a query.
# Uses cosine similarity on OpenAI embeddings stored in MariaDB.

import json
import math

import frappe
from frappe import _

from oly_ai.core.provider import LLMProvider


def cosine_similarity(a, b):
	"""Compute cosine similarity between two vectors."""
	dot = sum(x * y for x, y in zip(a, b))
	norm_a = math.sqrt(sum(x * x for x in a))
	norm_b = math.sqrt(sum(x * x for x in b))
	if norm_a == 0 or norm_b == 0:
		return 0.0
	return dot / (norm_a * norm_b)


def retrieve(query, top_k=5, min_score=0.7, doctype_filter=None):
	"""Retrieve the most relevant chunks for a query.

	Args:
		query: The user's question or search text
		top_k: Number of top results to return
		min_score: Minimum cosine similarity threshold
		doctype_filter: Optional doctype to restrict search to

	Returns:
		list of dict: [{chunk_text, reference_doctype, reference_name, score}, ...]
	"""
	# Get query embedding
	settings = frappe.get_cached_doc("AI Settings")
	provider = LLMProvider(settings)

	try:
		query_embedding = provider.get_embeddings(query)[0]
	except Exception as e:
		frappe.log_error(f"RAG query embedding failed: {e}", "RAG Retriever")
		return []

	# Load all stored embeddings
	filters = {}
	if doctype_filter:
		filters["reference_doctype"] = doctype_filter

	chunks = frappe.get_all(
		"AI Document Index",
		filters=filters,
		fields=["name", "reference_doctype", "reference_name", "chunk_text", "embedding"],
		limit=10000,  # Reasonable limit for MariaDB-based approach
	)

	if not chunks:
		return []

	# Score each chunk
	scored = []
	for chunk in chunks:
		try:
			stored_embedding = json.loads(chunk.embedding)
			score = cosine_similarity(query_embedding, stored_embedding)
			if score >= min_score:
				scored.append({
					"chunk_text": chunk.chunk_text,
					"reference_doctype": chunk.reference_doctype,
					"reference_name": chunk.reference_name,
					"score": round(score, 4),
				})
		except (json.JSONDecodeError, TypeError):
			continue

	# Sort by score descending, take top_k
	scored.sort(key=lambda x: x["score"], reverse=True)
	return scored[:top_k]


def build_rag_context(query, top_k=5, min_score=0.7):
	"""Build a context string from retrieved chunks for injection into prompts.

	Returns:
		tuple: (context_text, sources) where sources is a list of source references
	"""
	results = retrieve(query, top_k=top_k, min_score=min_score)

	if not results:
		return "", []

	context_parts = []
	sources = []
	seen_sources = set()

	for i, r in enumerate(results, 1):
		context_parts.append(f"[Source {i}] ({r['reference_doctype']}: {r['reference_name']}, relevance: {r['score']})\n{r['chunk_text']}")
		source_key = f"{r['reference_doctype']}/{r['reference_name']}"
		if source_key not in seen_sources:
			sources.append({
				"doctype": r["reference_doctype"],
				"name": r["reference_name"],
				"score": r["score"],
			})
			seen_sources.add(source_key)

	context_text = "\n\n---\n\n".join(context_parts)
	return context_text, sources
