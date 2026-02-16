# Copyright (c) 2026, OLY Technologies and contributors
# RAG Indexer — Extracts text from ERPNext documents/Wiki and creates embeddings.
# Stores vectors in MariaDB (no external vector DB needed for Phase 1).

import hashlib
import json

import frappe
from frappe import _
from frappe.utils import cstr

from oly_ai.core.provider import LLMProvider


def chunk_text(text, chunk_size=500, overlap=50):
	"""Split text into overlapping chunks for embedding."""
	if not text:
		return []

	words = text.split()
	chunks = []
	i = 0
	while i < len(words):
		chunk = " ".join(words[i : i + chunk_size])
		if chunk.strip():
			chunks.append(chunk.strip())
		i += chunk_size - overlap

	return chunks


def compute_content_hash(text):
	"""Hash content to detect changes without re-embedding."""
	return hashlib.sha256(cstr(text).encode()).hexdigest()[:32]


def extract_document_text(doctype, name):
	"""Extract indexable text from a Frappe document.

	Handles special doctypes like Wiki Page, Blog Post, etc.
	Falls back to a generic field extraction for any doctype.
	"""
	doc = frappe.get_doc(doctype, name)
	parts = []

	# Title / Name
	for field in ["title", "subject", "lead_name", "customer_name", "supplier_name", "employee_name"]:
		val = getattr(doc, field, None)
		if val:
			parts.append(f"Title: {val}")
			break

	# Special doctypes
	if doctype == "Wiki Page":
		if hasattr(doc, "content") and doc.content:
			parts.append(doc.content)
	elif doctype == "Blog Post":
		if doc.content:
			parts.append(doc.content)
		if doc.blog_intro:
			parts.append(doc.blog_intro)
	elif doctype == "Note":
		if doc.content:
			parts.append(doc.content)
	else:
		# Generic: extract all text fields
		meta = frappe.get_meta(doctype)
		for field in meta.fields:
			if field.fieldtype in ("Text", "Small Text", "Long Text", "Text Editor", "Markdown Editor", "Data", "Select"):
				val = getattr(doc, field.fieldname, None)
				if val and len(cstr(val)) > 5:
					parts.append(f"{field.label}: {val}")

	# Include comments / communications
	comms = frappe.get_all(
		"Communication",
		filters={"reference_doctype": doctype, "reference_name": name},
		fields=["content", "subject"],
		order_by="creation desc",
		limit=5,
	)
	for comm in comms:
		if comm.content:
			parts.append(f"Communication: {frappe.utils.strip_html(comm.content)[:500]}")

	return "\n\n".join(parts)


@frappe.whitelist()
def index_document(doctype, name):
	"""Index a single document — extract text, chunk, embed, store."""
	frappe.only_for(["System Manager", "Administrator"])

	text = extract_document_text(doctype, name)
	if not text or len(text) < 20:
		return {"status": "skipped", "reason": "No meaningful text content"}

	content_hash = compute_content_hash(text)

	# Check if already indexed with same content
	existing = frappe.db.get_value(
		"AI Document Index",
		{"reference_doctype": doctype, "reference_name": name},
		["name", "content_hash"],
		as_dict=True,
	)
	if existing and existing.content_hash == content_hash:
		return {"status": "skipped", "reason": "Content unchanged"}

	# Chunk the text
	chunks = chunk_text(text)
	if not chunks:
		return {"status": "skipped", "reason": "No chunks created"}

	# Get embeddings
	settings = frappe.get_cached_doc("AI Settings")
	provider = LLMProvider(settings)

	try:
		embeddings = provider.get_embeddings(chunks)
	except Exception as e:
		frappe.log_error(f"Embedding failed for {doctype}/{name}: {e}", "RAG Indexer")
		return {"status": "error", "reason": str(e)}

	# Delete old index entries for this doc
	if existing:
		frappe.db.delete("AI Document Index", {"reference_doctype": doctype, "reference_name": name})

	# Store chunks with embeddings
	for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
		doc = frappe.new_doc("AI Document Index")
		doc.reference_doctype = doctype
		doc.reference_name = name
		doc.chunk_index = i
		doc.chunk_text = chunk
		doc.content_hash = content_hash
		doc.embedding = json.dumps(embedding)
		doc.flags.ignore_permissions = True
		doc.insert()

	frappe.db.commit()
	return {"status": "indexed", "chunks": len(chunks)}


@frappe.whitelist()
def index_doctype(doctype, limit=100):
	"""Index all documents of a given doctype."""
	frappe.only_for(["System Manager", "Administrator"])

	docs = frappe.get_all(doctype, limit=limit, pluck="name")
	results = {"indexed": 0, "skipped": 0, "errors": 0}

	for name in docs:
		try:
			result = index_document(doctype, name)
			if result["status"] == "indexed":
				results["indexed"] += 1
			elif result["status"] == "skipped":
				results["skipped"] += 1
			else:
				results["errors"] += 1
		except Exception as e:
			frappe.log_error(f"Index error: {doctype}/{name}: {e}", "RAG Indexer")
			results["errors"] += 1

	return results


@frappe.whitelist()
def get_index_stats():
	"""Get statistics about the RAG index."""
	frappe.only_for(["System Manager", "Administrator"])

	total_chunks = frappe.db.count("AI Document Index")
	doctypes = frappe.db.sql("""
		SELECT reference_doctype as doctype,
			COUNT(DISTINCT reference_name) as docs,
			COUNT(*) as chunks
		FROM `tabAI Document Index`
		GROUP BY reference_doctype
		ORDER BY docs DESC
	""", as_dict=True)

	return {
		"total_chunks": total_chunks,
		"doctypes": doctypes,
	}
