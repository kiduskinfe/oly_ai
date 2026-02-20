# Copyright (c) 2026, OLY Technologies and contributors
# RAG Retriever — Finds the most relevant document chunks for a query.
# Uses numpy-accelerated cosine similarity on embeddings stored in MariaDB.
# Supports keyword pre-filtering to reduce the search space for large indexes.

import json

import frappe
from frappe import _

from oly_ai.core.provider import LLMProvider

# Cache for numpy import (lazy load)
_np = None


def _get_numpy():
	"""Lazy-load numpy to avoid import overhead when not needed."""
	global _np
	if _np is None:
		import numpy as np
		_np = np
	return _np


def _extract_keywords(query, min_length=3, max_keywords=8):
	"""Extract meaningful keywords from a query for pre-filtering.

	Strips common stop words and returns the most distinctive terms.
	"""
	stop_words = {
		"the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
		"have", "has", "had", "do", "does", "did", "will", "would", "could",
		"should", "may", "might", "can", "shall", "to", "of", "in", "for",
		"on", "with", "at", "by", "from", "as", "into", "through", "during",
		"before", "after", "above", "below", "between", "under", "again",
		"further", "then", "once", "here", "there", "when", "where", "why",
		"how", "all", "both", "each", "few", "more", "most", "other", "some",
		"such", "no", "nor", "not", "only", "own", "same", "so", "than",
		"too", "very", "just", "about", "what", "which", "who", "whom",
		"this", "that", "these", "those", "it", "its", "and", "but", "or",
		"me", "my", "we", "our", "you", "your", "he", "she", "they", "them",
		"his", "her", "i", "am",
	}

	words = query.lower().split()
	keywords = [w.strip(".,!?;:'\"()[]{}") for w in words]
	keywords = [w for w in keywords if len(w) >= min_length and w not in stop_words]

	# Deduplicate while preserving order
	seen = set()
	unique = []
	for w in keywords:
		if w not in seen:
			seen.add(w)
			unique.append(w)

	return unique[:max_keywords]


def retrieve(query, top_k=5, min_score=0.7, doctype_filter=None):
	"""Retrieve the most relevant chunks for a query.

	Uses numpy vectorized cosine similarity for fast scoring.
	Applies keyword pre-filtering when the index is large (>500 chunks).

	Args:
		query: The user's question or search text
		top_k: Number of top results to return
		min_score: Minimum cosine similarity threshold
		doctype_filter: Optional doctype to restrict search to

	Returns:
		list of dict: [{chunk_text, reference_doctype, reference_name, score}, ...]
	"""
	np = _get_numpy()

	# Get query embedding
	settings = frappe.get_cached_doc("AI Settings")
	provider = LLMProvider(settings)

	try:
		query_embedding = provider.get_embeddings(query)[0]
	except Exception as e:
		frappe.log_error(f"RAG query embedding failed: {e}", "RAG Retriever")
		return []

	query_vec = np.array(query_embedding, dtype=np.float32)

	# Determine total count for filtering strategy
	count_filters = {}
	if doctype_filter:
		count_filters["reference_doctype"] = doctype_filter

	total_chunks = frappe.db.count("AI Document Index", filters=count_filters)
	if total_chunks == 0:
		return []

	# Keyword pre-filtering for large indexes (>500 chunks)
	use_keyword_filter = total_chunks > 500
	keyword_filtered_names = None

	if use_keyword_filter:
		keywords = _extract_keywords(query)
		if keywords:
			# Build SQL LIKE conditions — match any keyword in chunk_text
			conditions = []
			values = {}
			for i, kw in enumerate(keywords):
				conditions.append(f"`chunk_text` LIKE %(kw_{i})s")
				values[f"kw_{i}"] = f"%{kw}%"

			where_clause = " OR ".join(conditions)
			if doctype_filter:
				where_clause = f"(`reference_doctype` = %(dt)s) AND ({where_clause})"
				values["dt"] = doctype_filter

			try:
				keyword_filtered_names = frappe.db.sql(
					f"""SELECT name FROM `tabAI Document Index`
					WHERE {where_clause}
					LIMIT 2000""",
					values,
					as_list=True,
				)
				keyword_filtered_names = [r[0] for r in keyword_filtered_names]
			except Exception:
				keyword_filtered_names = None  # Fall back to full scan

	# Load embeddings — either filtered subset or all
	db_filters = {}
	if doctype_filter:
		db_filters["reference_doctype"] = doctype_filter

	if keyword_filtered_names is not None and len(keyword_filtered_names) > 0:
		# Use keyword-filtered subset
		db_filters["name"] = ("in", keyword_filtered_names)
		limit = len(keyword_filtered_names)
	else:
		limit = 10000  # Reasonable limit for full scan

	chunks = frappe.get_all(
		"AI Document Index",
		filters=db_filters,
		fields=["name", "reference_doctype", "reference_name", "chunk_text", "embedding"],
		limit=limit,
	)

	if not chunks:
		return []

	# Parse embeddings and build matrix for vectorized similarity
	valid_chunks = []
	embedding_list = []

	for chunk in chunks:
		try:
			emb = json.loads(chunk.embedding)
			embedding_list.append(emb)
			valid_chunks.append(chunk)
		except (json.JSONDecodeError, TypeError):
			continue

	if not valid_chunks:
		return []

	# Vectorized cosine similarity using numpy
	embedding_matrix = np.array(embedding_list, dtype=np.float32)  # shape: (N, dim)

	# Compute norms
	query_norm = np.linalg.norm(query_vec)
	if query_norm == 0:
		return []

	chunk_norms = np.linalg.norm(embedding_matrix, axis=1)  # shape: (N,)

	# Avoid division by zero
	nonzero_mask = chunk_norms > 0
	if not np.any(nonzero_mask):
		return []

	# Compute dot products and similarities
	dots = embedding_matrix[nonzero_mask] @ query_vec  # shape: (M,)
	similarities = dots / (chunk_norms[nonzero_mask] * query_norm)  # shape: (M,)

	# Filter by min_score and get top_k
	score_mask = similarities >= min_score
	if not np.any(score_mask):
		return []

	# Get indices of valid chunks that pass both masks
	nonzero_indices = np.where(nonzero_mask)[0]
	passing_indices = nonzero_indices[score_mask]
	passing_scores = similarities[score_mask]

	# Sort by score descending, take top_k
	if len(passing_scores) > top_k:
		top_indices = np.argsort(passing_scores)[::-1][:top_k]
	else:
		top_indices = np.argsort(passing_scores)[::-1]

	# Build results
	scored = []
	for idx in top_indices:
		chunk_idx = passing_indices[idx]
		chunk = valid_chunks[chunk_idx]
		scored.append({
			"chunk_text": chunk.chunk_text,
			"reference_doctype": chunk.reference_doctype,
			"reference_name": chunk.reference_name,
			"score": round(float(passing_scores[idx]), 4),
		})

	return scored


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
