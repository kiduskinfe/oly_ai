# Copyright (c) 2026, OLY Technologies and contributors
# Training API — Index management, bulk indexing, stats, and auto-reindex hooks

import frappe
from frappe import _
from frappe.utils import now_datetime


@frappe.whitelist()
def index_doctype_full(doctype, limit=500):
	"""Index all documents of a given DocType. Updates the AI Indexed DocType stats.

	Args:
		doctype: DocType name to index
		limit: Maximum documents to process (default 500)

	Returns:
		dict: {"indexed": N, "skipped": N, "errors": N}
	"""
	frappe.only_for(["System Manager", "Administrator"])

	from oly_ai.core.rag.indexer import index_document

	docs = frappe.get_all(doctype, limit=int(limit), pluck="name")
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
			frappe.log_error(f"Index error: {doctype}/{name}: {e}", "AI Training")
			results["errors"] += 1

	# Update the indexed doctype stats in AI Settings
	_update_doctype_stats(doctype, results)

	return results


@frappe.whitelist()
def index_single_document(doctype, name):
	"""Index or re-index a single document.

	Args:
		doctype: DocType name
		name: Document name

	Returns:
		dict: {"status": "indexed"|"skipped"|"error", ...}
	"""
	frappe.only_for(["System Manager", "Administrator"])

	from oly_ai.core.rag.indexer import index_document
	return index_document(doctype, name)


@frappe.whitelist()
def get_index_stats():
	"""Get RAG index statistics.

	Returns:
		dict: {"total_chunks": N, "doctypes": [{"doctype", "docs", "chunks"}]}
	"""
	frappe.only_for(["System Manager", "Administrator"])

	from oly_ai.core.rag.indexer import get_index_stats as _get_stats
	return _get_stats()


@frappe.whitelist()
def clear_all_index_data():
	"""Delete all RAG index entries.

	Returns:
		dict: {"deleted": N}
	"""
	frappe.only_for(["System Manager", "Administrator"])

	count = frappe.db.count("AI Document Index")
	frappe.db.sql("DELETE FROM `tabAI Document Index`")
	frappe.db.commit()

	# Reset stats in AI Settings
	settings = frappe.get_doc("AI Settings")
	for row in settings.get("indexed_doctypes", []):
		row.indexed_count = 0
		row.chunk_count = 0
		row.last_indexed = None
	settings.flags.ignore_permissions = True
	settings.save()
	frappe.db.commit()

	return {"deleted": count}


@frappe.whitelist()
def clear_doctype_index(doctype):
	"""Delete all index entries for a specific DocType.

	Returns:
		dict: {"deleted": N}
	"""
	frappe.only_for(["System Manager", "Administrator"])

	count = frappe.db.count("AI Document Index", {"reference_doctype": doctype})
	frappe.db.sql(
		"DELETE FROM `tabAI Document Index` WHERE reference_doctype = %s", doctype
	)
	frappe.db.commit()

	return {"deleted": count}


def _update_doctype_stats(doctype, results):
	"""Update the AI Indexed DocType child table stats after indexing."""
	try:
		settings = frappe.get_doc("AI Settings")
		for row in settings.get("indexed_doctypes", []):
			if row.document_type == doctype:
				# Get actual counts from index
				stats = frappe.db.sql(
					"""SELECT COUNT(DISTINCT reference_name) as docs, COUNT(*) as chunks
					FROM `tabAI Document Index`
					WHERE reference_doctype = %s""",
					doctype,
					as_dict=True,
				)
				if stats:
					row.indexed_count = stats[0].docs
					row.chunk_count = stats[0].chunks
				row.last_indexed = now_datetime()
				break

		settings.flags.ignore_permissions = True
		settings.save()
		frappe.db.commit()
	except Exception:
		pass


# ─── Auto-Reindex Hooks ──────────────────────────────────────

def auto_index_on_update(doc, method=None):
	"""Hook: Re-index a document when it's saved/updated.

	Called via doc_events in hooks.py. Only processes documents
	whose DocType is in the indexed_doctypes table with auto_index enabled.
	"""
	_queue_auto_index(doc.doctype, doc.name, "index")


def auto_index_on_insert(doc, method=None):
	"""Hook: Index a new document when it's created."""
	_queue_auto_index(doc.doctype, doc.name, "index")


def auto_index_on_trash(doc, method=None):
	"""Hook: Remove index entries when a document is deleted."""
	_queue_auto_index(doc.doctype, doc.name, "delete")


def _queue_auto_index(doctype, name, action):
	"""Queue an auto-index job if this DocType is configured for auto-indexing."""
	try:
		# Quick check — is this DocType in the indexed list with auto_index enabled?
		settings = frappe.get_cached_doc("AI Settings")
		auto_doctypes = [
			row.document_type
			for row in settings.get("indexed_doctypes", [])
			if row.enabled and row.auto_index
		]

		if doctype not in auto_doctypes:
			return

		if action == "delete":
			# Delete immediately (fast operation)
			frappe.db.sql(
				"DELETE FROM `tabAI Document Index` WHERE reference_doctype = %s AND reference_name = %s",
				(doctype, name),
			)
		else:
			# Queue indexing in background to avoid slowing down saves
			frappe.enqueue(
				"oly_ai.core.rag.indexer.index_document",
				doctype=doctype,
				name=name,
				queue="short",
				deduplicate=True,
			)
	except Exception:
		# Never break the parent save operation
		pass


def scheduled_reindex():
	"""Scheduled task: Nightly full re-index of all configured DocTypes."""
	try:
		settings = frappe.get_doc("AI Settings")
		indexed_doctypes = [
			row.document_type
			for row in settings.get("indexed_doctypes", [])
			if row.enabled
		]

		for dt in indexed_doctypes:
			try:
				from oly_ai.core.rag.indexer import index_doctype
				result = index_doctype(dt, limit=500)
				_update_doctype_stats(dt, result)
				frappe.logger("oly_ai").info(
					f"Nightly reindex: {dt} — {result.get('indexed', 0)} indexed, "
					f"{result.get('skipped', 0)} skipped, {result.get('errors', 0)} errors"
				)
			except Exception as e:
				frappe.log_error(f"Nightly reindex error for {dt}: {e}", "AI Training")

	except Exception as e:
		frappe.log_error(f"Scheduled reindex failed: {e}", "AI Training")
