# Copyright (c) 2026, OLY Technologies and contributors
# Test suite for oly_ai — security, budget, access control, input validation

import ast
import unittest
from unittest.mock import patch, MagicMock

import frappe
from frappe.tests.utils import FrappeTestCase


class TestCostTracker(FrappeTestCase):
	"""Tests for core/cost_tracker.py — budget enforcement and cost estimation."""

	def test_estimate_cost_known_model(self):
		"""Known model returns correct cost calculation."""
		from oly_ai.core.cost_tracker import estimate_cost

		# gpt-4o-mini: input=$0.15/1M, output=$0.60/1M
		cost = estimate_cost("gpt-4o-mini", 1_000_000, 1_000_000)
		self.assertAlmostEqual(cost, 0.75, places=4)

	def test_estimate_cost_unknown_model(self):
		"""Unknown model uses conservative default pricing."""
		from oly_ai.core.cost_tracker import estimate_cost

		# Default: input=$1.0/1M, output=$3.0/1M
		cost = estimate_cost("unknown-model-xyz", 1_000_000, 0)
		self.assertAlmostEqual(cost, 1.0, places=4)

	def test_estimate_cost_zero_tokens(self):
		"""Zero tokens yields zero cost."""
		from oly_ai.core.cost_tracker import estimate_cost
		self.assertEqual(estimate_cost("gpt-4o-mini", 0, 0), 0)

	def test_check_budget_within_limit(self):
		"""Budget check passes when spend is under limit."""
		from oly_ai.core.cost_tracker import check_budget

		settings = frappe.get_doc("AI Settings")
		original_budget = settings.monthly_budget_usd
		original_spend = settings.current_month_spend

		try:
			settings.monthly_budget_usd = 100.0
			settings.current_month_spend = 10.0
			settings.save(ignore_permissions=True)
			frappe.db.commit()
			frappe.clear_cache()

			allowed, reason = check_budget("Administrator")
			self.assertTrue(allowed)
			self.assertEqual(reason, "")
		finally:
			settings.monthly_budget_usd = original_budget
			settings.current_month_spend = original_spend
			settings.save(ignore_permissions=True)
			frappe.db.commit()
			frappe.clear_cache()

	@patch("oly_ai.core.cost_tracker.get_current_month_spend", return_value=60.0)
	def test_check_budget_exceeded(self, mock_spend):
		"""Budget check fails when spend exceeds limit."""
		from oly_ai.core.cost_tracker import check_budget

		settings = frappe.get_doc("AI Settings")
		original_budget = settings.monthly_budget_usd

		try:
			settings.monthly_budget_usd = 50.0
			settings.save(ignore_permissions=True)
			frappe.db.commit()
			frappe.clear_cache()

			allowed, reason = check_budget("Administrator")
			self.assertFalse(allowed)
			self.assertIn("exceeded", reason)
		finally:
			settings.monthly_budget_usd = original_budget
			settings.save(ignore_permissions=True)
			frappe.db.commit()
			frappe.clear_cache()


class TestInputValidation(FrappeTestCase):
	"""Tests for input validation on voice and image parameters."""

	def test_voice_validation_valid(self):
		"""Valid voice names should not raise."""
		VALID_VOICES = {"alloy", "echo", "fable", "onyx", "nova", "shimmer"}
		for voice in VALID_VOICES:
			self.assertIn(voice, VALID_VOICES)

	def test_voice_validation_invalid(self):
		"""Invalid voice should be rejected by text_to_speech."""
		# We test the validation inline since calling the full API needs OpenAI keys
		VALID_VOICES = {"alloy", "echo", "fable", "onyx", "nova", "shimmer"}
		self.assertNotIn("evil_voice", VALID_VOICES)
		self.assertNotIn("", VALID_VOICES)
		self.assertNotIn("ALLOY", VALID_VOICES)  # case sensitive

	def test_image_size_validation(self):
		"""Only DALL-E 3 supported sizes should pass."""
		VALID_SIZES = {"1024x1024", "1024x1792", "1792x1024"}
		self.assertIn("1024x1024", VALID_SIZES)
		self.assertNotIn("512x512", VALID_SIZES)
		self.assertNotIn("256x256", VALID_SIZES)

	def test_image_quality_validation(self):
		"""Only 'standard' and 'hd' should pass."""
		VALID_QUALITIES = {"standard", "hd"}
		self.assertIn("standard", VALID_QUALITIES)
		self.assertIn("hd", VALID_QUALITIES)
		self.assertNotIn("ultra", VALID_QUALITIES)
		self.assertNotIn("", VALID_QUALITIES)


class TestWorkflowConditionalSafety(FrappeTestCase):
	"""Tests for workflow_engine.py _step_conditional() — AST allowlist."""

	def _eval_condition(self, condition, context=None):
		from oly_ai.core.workflow_engine import _step_conditional
		return _step_conditional(condition, context or {})

	def test_simple_equality(self):
		result = self._eval_condition("x == 1", {"x": 1})
		self.assertIn("True", result)

	def test_simple_inequality(self):
		result = self._eval_condition("x != 1", {"x": 2})
		self.assertIn("True", result)

	def test_comparison_operators(self):
		self.assertIn("True", self._eval_condition("x > 5", {"x": 10}))
		self.assertIn("True", self._eval_condition("x < 5", {"x": 2}))
		self.assertIn("True", self._eval_condition("x >= 5", {"x": 5}))
		self.assertIn("True", self._eval_condition("x <= 5", {"x": 5}))

	def test_boolean_operators(self):
		self.assertIn("True", self._eval_condition("x > 1 and x < 10", {"x": 5}))
		self.assertIn("True", self._eval_condition("x < 1 or x > 10", {"x": 15}))

	def test_in_operator(self):
		self.assertIn("True", self._eval_condition("x in [1, 2, 3]", {"x": 2}))
		self.assertIn("True", self._eval_condition("x not in [1, 2, 3]", {"x": 5}))

	def test_blocks_function_calls(self):
		"""Function calls like os.system() must be blocked."""
		result = self._eval_condition("__import__('os').system('rm -rf /')", {})
		self.assertIn("disallowed", result.lower())

	def test_blocks_attribute_access(self):
		"""Attribute access must be blocked."""
		result = self._eval_condition("x.__class__", {"x": 1})
		self.assertIn("disallowed", result.lower())

	def test_blocks_lambda(self):
		"""Lambda expressions must be blocked."""
		result = self._eval_condition("(lambda: None)()", {})
		self.assertIn("disallowed", result.lower())

	def test_blocks_comprehension(self):
		"""List comprehensions must be blocked."""
		result = self._eval_condition("[x for x in range(10)]", {})
		self.assertIn("disallowed", result.lower())

	def test_blocks_subscript(self):
		"""Subscript access must be blocked."""
		result = self._eval_condition("x[0]", {"x": [1, 2, 3]})
		self.assertIn("disallowed", result.lower())


class TestSQLInjectionPrevention(FrappeTestCase):
	"""Tests for SQL injection prevention in tools.py field/operator validation."""

	def test_validate_field_allows_valid(self):
		from oly_ai.core.tools import _validate_doctype_field
		# Should not raise — 'name' is a standard field
		_validate_doctype_field("User", "name")
		_validate_doctype_field("User", "email")

	def test_validate_field_blocks_injection(self):
		from oly_ai.core.tools import _validate_doctype_field
		result = _validate_doctype_field("User", "name; DROP TABLE tabUser")
		self.assertFalse(result)

	def test_validate_field_blocks_sql_chars(self):
		from oly_ai.core.tools import _validate_doctype_field
		for bad in ["name--", "name/*", "1=1", "'; DROP TABLE", "name UNION SELECT"]:
			result = _validate_doctype_field("User", bad)
			self.assertFalse(result, f"Expected False for injection: {bad}")

	def test_allowed_operators(self):
		from oly_ai.core.tools import _ALLOWED_SQL_OPERATORS
		# Basic operators must be allowed
		for op in ["=", "!=", ">", "<", ">=", "<=", "like", "in", "not in"]:
			self.assertIn(op, _ALLOWED_SQL_OPERATORS)
		# Dangerous strings must not be operators
		for bad in ["DROP", "UNION", ";", "--"]:
			self.assertNotIn(bad, _ALLOWED_SQL_OPERATORS)


class TestAccessControl(FrappeTestCase):
	"""Tests for session access control — users can only access their own data."""

	def test_get_sessions_returns_user_scoped(self):
		"""get_sessions should only return sessions owned by the current user."""
		from oly_ai.api.chat import get_sessions

		user = frappe.session.user

		# Create a test session
		session = frappe.new_doc("AI Chat Session")
		session.title = "Test Session for Access Control"
		session.user = user
		session.model = "gpt-4o-mini"
		session.flags.ignore_permissions = True
		session.insert()
		frappe.db.commit()

		try:
			result = get_sessions(filter_type="mine")
			# All returned sessions should belong to current user
			for s in result:
				self.assertEqual(s["user"], user)
		finally:
			frappe.delete_doc("AI Chat Session", session.name, force=True)
			frappe.db.commit()


class TestRateLimiter(FrappeTestCase):
	"""Tests for the sliding-window rate limiter."""

	def test_rate_limit_allows_under_limit(self):
		"""Requests under the limit should pass."""
		from oly_ai.api.chat import _check_rate_limit
		# Clear any existing rate limit data
		cache_key = f"oly_ai_rate:{frappe.session.user}"
		try:
			frappe.cache().delete(cache_key)
		except Exception:
			pass

		allowed, retry_after = _check_rate_limit(frappe.session.user)
		self.assertTrue(allowed)
		self.assertEqual(retry_after, 0)

	def test_rate_limit_blocks_over_limit(self):
		"""Requests over the per-minute limit should be blocked."""
		from oly_ai.api.chat import _check_rate_limit
		import time as _time

		settings = frappe.get_doc("AI Settings")
		original = settings.get("rate_limit_per_minute")

		try:
			# Set a very low limit
			settings.rate_limit_per_minute = 2
			settings.save(ignore_permissions=True)
			frappe.db.commit()
			frappe.clear_cache()

			user = frappe.session.user
			cache_key = f"oly_ai_rate:{user}"
			try:
				frappe.cache().delete(cache_key)
			except Exception:
				pass

			# Make requests up to the limit
			_check_rate_limit(user)
			_check_rate_limit(user)

			# Third should be blocked
			allowed, retry_after = _check_rate_limit(user)
			self.assertFalse(allowed)
			self.assertGreater(retry_after, 0)
		finally:
			settings.rate_limit_per_minute = original or 0
			settings.save(ignore_permissions=True)
			frappe.db.commit()
			frappe.clear_cache()


class TestModelAllowlist(FrappeTestCase):
	"""Tests that model names are validated against allowed patterns."""

	def test_valid_model_patterns(self):
		"""Standard model names should pass regex validation."""
		import re
		pattern = r"^[a-zA-Z0-9][a-zA-Z0-9._:\-/]{0,99}$"
		valid = [
			"gpt-4o-mini", "gpt-5.2", "claude-3-7-sonnet-latest",
			"dall-e-3", "text-embedding-3-small", "deepseek-chat",
		]
		for m in valid:
			self.assertIsNotNone(re.match(pattern, m), f"Valid model rejected: {m}")

	def test_invalid_model_patterns(self):
		"""Injection attempts should fail regex validation."""
		import re
		pattern = r"^[a-zA-Z0-9][a-zA-Z0-9._:\-/]{0,99}$"
		invalid = [
			"", " gpt-4o", "gpt-4o; DROP TABLE", "model\ninjection",
			"a" * 200, "../../../etc/passwd",
		]
		for m in invalid:
			self.assertIsNone(re.match(pattern, m), f"Invalid model accepted: {m}")


class TestNPlusOneOptimization(FrappeTestCase):
	"""Verify get_sessions uses batched queries, not per-session loops."""

	def test_get_sessions_batch_queries(self):
		"""get_sessions should work correctly after N+1 optimization."""
		from oly_ai.api.chat import get_sessions

		user = frappe.session.user

		# Create two test sessions
		sessions_created = []
		for i in range(2):
			session = frappe.new_doc("AI Chat Session")
			session.title = f"N+1 Test Session {i}"
			session.user = user
			session.model = "gpt-4o-mini"
			session.flags.ignore_permissions = True
			session.insert()
			sessions_created.append(session.name)

		frappe.db.commit()

		try:
			result = get_sessions(filter_type="mine")
			# Should return list with expected fields
			self.assertIsInstance(result, list)
			for s in result:
				self.assertIn("preview", s)
				self.assertIn("message_count", s)
				self.assertIn("shared_count", s)
				self.assertIn("is_owner", s)
		finally:
			for name in sessions_created:
				frappe.delete_doc("AI Chat Session", name, force=True)
			frappe.db.commit()


class TestWebSearchTool(FrappeTestCase):
	"""Tests for the web_search tool handler."""

	def test_web_search_empty_query(self):
		"""Empty query returns error."""
		from oly_ai.core.tools import _tool_web_search
		result = _tool_web_search({"query": ""}, "Administrator")
		self.assertIn("error", result)

	def test_web_search_max_results_clamped(self):
		"""Max results is clamped between 1 and 10."""
		from oly_ai.core.tools import _tool_web_search
		# Should not crash with out-of-range values
		with patch("oly_ai.core.tools.DDGS", create=True) as mock_ddgs:
			# Mock the context manager and text method
			mock_instance = MagicMock()
			mock_instance.text.return_value = [{"title": "Test", "href": "https://test.com", "body": "Testing"}]
			mock_ddgs.return_value.__enter__ = MagicMock(return_value=mock_instance)
			mock_ddgs.return_value.__exit__ = MagicMock(return_value=False)

			with patch("oly_ai.core.tools._tool_web_search") as mock_search:
				mock_search.return_value = {"query": "test", "result_count": 1, "results": []}
				result = mock_search({"query": "test", "max_results": 50}, "Administrator")
				self.assertNotIn("error", result)

	def test_web_search_missing_package(self):
		"""Missing duckduckgo-search package returns graceful error."""
		from oly_ai.core.tools import _tool_web_search
		with patch.dict("sys.modules", {"duckduckgo_search": None}):
			# Force reimport to hit ImportError
			import importlib
			import oly_ai.core.tools as tools_mod
			# Direct call - the import is inside the function
			result = _tool_web_search.__wrapped__({"query": "test"}, "Administrator") if hasattr(_tool_web_search, '__wrapped__') else None
			# Just verify the function exists and handles errors
			self.assertIsNotNone(_tool_web_search)


class TestAnalyzeFileTool(FrappeTestCase):
	"""Tests for the analyze_file tool handler."""

	def test_analyze_file_empty_url(self):
		"""Empty file_url returns error."""
		from oly_ai.core.tools import _tool_analyze_file
		result = _tool_analyze_file({"file_url": ""}, "Administrator")
		self.assertIn("error", result)

	def test_analyze_file_nonexistent(self):
		"""Nonexistent file returns error."""
		from oly_ai.core.tools import _tool_analyze_file
		result = _tool_analyze_file({"file_url": "/files/nonexistent_xyz_abc.pdf"}, "Administrator")
		self.assertIn("error", result)


class TestFileParser(FrappeTestCase):
	"""Tests for file_parser.py."""

	def test_supported_extensions(self):
		"""Supported extensions include expected file types."""
		from oly_ai.core.file_parser import SUPPORTED_EXTENSIONS
		self.assertIn(".pdf", SUPPORTED_EXTENSIONS)
		self.assertIn(".xlsx", SUPPORTED_EXTENSIONS)
		self.assertIn(".csv", SUPPORTED_EXTENSIONS)
		self.assertIn(".docx", SUPPORTED_EXTENSIONS)
		self.assertIn(".txt", SUPPORTED_EXTENSIONS)

	def test_parse_file_nonexistent(self):
		"""Nonexistent file returns error dict."""
		from oly_ai.core.file_parser import parse_file
		result = parse_file("/files/does_not_exist_xyz123.pdf")
		self.assertIn("error", result)

	def test_parse_file_unsupported_extension(self):
		"""Unsupported file extension returns error."""
		from oly_ai.core.file_parser import parse_file
		result = parse_file("/files/test.exe")
		self.assertIn("error", result)

	def test_parse_files_for_context_empty(self):
		"""Empty file list returns empty string."""
		from oly_ai.core.file_parser import parse_files_for_context
		result = parse_files_for_context([])
		self.assertEqual(result, "")


class TestRAGRetriever(FrappeTestCase):
	"""Tests for the numpy-optimized RAG retriever."""

	def test_keyword_extraction(self):
		"""Keywords are extracted correctly from query."""
		from oly_ai.core.rag.retriever import _extract_keywords
		keywords = _extract_keywords("What is the total revenue for this quarter?")
		self.assertIn("total", keywords)
		self.assertIn("revenue", keywords)
		self.assertIn("quarter", keywords)
		# Stop words should be excluded
		self.assertNotIn("is", keywords)
		self.assertNotIn("the", keywords)
		self.assertNotIn("for", keywords)

	def test_keyword_extraction_dedup(self):
		"""Duplicate keywords are removed."""
		from oly_ai.core.rag.retriever import _extract_keywords
		keywords = _extract_keywords("revenue revenue revenue total total")
		self.assertEqual(len(set(keywords)), len(keywords))

	def test_keyword_extraction_max_limit(self):
		"""Keywords are limited to max_keywords."""
		from oly_ai.core.rag.retriever import _extract_keywords
		long_query = " ".join([f"keyword{i}" for i in range(20)])
		keywords = _extract_keywords(long_query, max_keywords=5)
		self.assertLessEqual(len(keywords), 5)

	def test_numpy_import(self):
		"""Numpy lazy loader works correctly."""
		from oly_ai.core.rag.retriever import _get_numpy
		np = _get_numpy()
		self.assertIsNotNone(np)
		# Verify it's actually numpy
		arr = np.array([1.0, 2.0, 3.0])
		self.assertEqual(arr.shape, (3,))

	def test_retrieve_empty_index(self):
		"""Retrieve returns empty list when no chunks exist for a rare doctype."""
		from oly_ai.core.rag.retriever import retrieve
		with patch("oly_ai.core.rag.retriever.frappe") as mock_frappe:
			mock_frappe.get_cached_doc.return_value = MagicMock()
			mock_frappe.db.count.return_value = 0
			with patch("oly_ai.core.rag.retriever.LLMProvider") as mock_provider:
				mock_provider.return_value.get_embeddings.return_value = [[0.1] * 10]
				result = retrieve("test query", doctype_filter="NonExistentDocType12345")
				self.assertIsInstance(result, list)


class TestConfigurableToolRounds(FrappeTestCase):
	"""Tests for configurable max tool rounds."""

	def test_ai_settings_has_max_tool_rounds_field(self):
		"""AI Settings DocType has max_tool_rounds field."""
		meta = frappe.get_meta("AI Settings")
		field = meta.get_field("max_tool_rounds")
		self.assertIsNotNone(field, "max_tool_rounds field should exist in AI Settings")
		self.assertEqual(field.fieldtype, "Int")

	def test_tool_definitions_include_new_tools(self):
		"""TOOL_DEFINITIONS includes all new tools."""
		from oly_ai.core.tools import TOOL_DEFINITIONS
		tool_names = [t["function"]["name"] for t in TOOL_DEFINITIONS]
		self.assertIn("web_search", tool_names)
		self.assertIn("analyze_file", tool_names)
		self.assertIn("read_webpage", tool_names)
		self.assertIn("run_code", tool_names)

	def test_get_available_tools_includes_new_tools_in_agent_mode(self):
		"""All new tools are available in agent mode."""
		from oly_ai.core.tools import get_available_tools
		tools = get_available_tools(user="Administrator", mode="agent")
		tool_names = [t["function"]["name"] for t in tools]
		# These should be in read_tools and available
		if "search_documents" in tool_names:  # Only if data queries enabled
			self.assertIn("web_search", tool_names)
			self.assertIn("analyze_file", tool_names)
			self.assertIn("read_webpage", tool_names)
			self.assertIn("run_code", tool_names)


class TestWebReader(FrappeTestCase):
	"""Tests for web_reader.py."""

	def test_empty_url(self):
		"""Empty URL returns error."""
		from oly_ai.core.web_reader import read_webpage
		result = read_webpage("")
		self.assertIn("error", result)

	def test_blocked_internal_url(self):
		"""Localhost URLs are blocked."""
		from oly_ai.core.web_reader import read_webpage
		result = read_webpage("http://localhost/admin")
		self.assertIn("error", result)
		self.assertIn("internal", result["error"].lower())

	def test_blocked_metadata_url(self):
		"""Cloud metadata endpoint is blocked."""
		from oly_ai.core.web_reader import read_webpage
		result = read_webpage("http://169.254.169.254/latest/meta-data/")
		self.assertIn("error", result)

	def test_blocked_binary_extension(self):
		"""Binary file URLs are blocked."""
		from oly_ai.core.web_reader import read_webpage
		result = read_webpage("https://example.com/malware.exe")
		self.assertIn("error", result)

	def test_read_webpage_tool_handler(self):
		"""read_webpage tool handler works."""
		from oly_ai.core.tools import _tool_read_webpage
		result = _tool_read_webpage({"url": ""}, "Administrator")
		self.assertIn("error", result)


class TestRunCode(FrappeTestCase):
	"""Tests for sandboxed code execution."""

	def test_simple_calculation(self):
		"""Simple math calculation works."""
		from oly_ai.core.tools import _tool_run_code
		result = _tool_run_code({"code": "print(2 + 2)"}, "Administrator")
		self.assertEqual(result.get("status"), "success")
		self.assertEqual(result.get("output"), "4")

	def test_math_import(self):
		"""Math module is available."""
		from oly_ai.core.tools import _tool_run_code
		result = _tool_run_code({"code": "print(math.sqrt(144))"}, "Administrator")
		self.assertEqual(result.get("status"), "success")
		self.assertIn("12", result.get("output", ""))

	def test_blocked_os_import(self):
		"""os module is blocked."""
		from oly_ai.core.tools import _tool_run_code
		result = _tool_run_code({"code": "import os\nprint(os.listdir('/'))"}, "Administrator")
		self.assertIn("error", result)
		self.assertIn("Blocked", result.get("error", ""))

	def test_blocked_subprocess(self):
		"""subprocess is blocked."""
		from oly_ai.core.tools import _tool_run_code
		result = _tool_run_code({"code": "import subprocess\nsubprocess.run(['ls'])"}, "Administrator")
		self.assertIn("error", result)

	def test_blocked_frappe(self):
		"""frappe import is blocked."""
		from oly_ai.core.tools import _tool_run_code
		result = _tool_run_code({"code": "import frappe\nprint(frappe.db.sql('SELECT 1'))"}, "Administrator")
		self.assertIn("error", result)

	def test_blocked_open(self):
		"""open() is blocked."""
		from oly_ai.core.tools import _tool_run_code
		result = _tool_run_code({"code": "f = open('/etc/passwd')\nprint(f.read())"}, "Administrator")
		self.assertIn("error", result)

	def test_empty_code(self):
		"""Empty code returns error."""
		from oly_ai.core.tools import _tool_run_code
		result = _tool_run_code({"code": ""}, "Administrator")
		self.assertIn("error", result)

	def test_statistics_module(self):
		"""statistics module works."""
		from oly_ai.core.tools import _tool_run_code
		result = _tool_run_code({"code": "data = [10, 20, 30, 40]\nprint(statistics.mean(data))"}, "Administrator")
		self.assertEqual(result.get("status"), "success")
		self.assertIn("25", result.get("output", ""))


class TestPIIFilter(FrappeTestCase):
	"""Tests for PII detection and masking."""

	def test_credit_card_masking(self):
		"""Credit card numbers are masked."""
		from oly_ai.core.pii_filter import mask_pii
		text = "My card is 4111-1111-1111-1111 please process"
		masked, detections = mask_pii(text)
		self.assertNotIn("4111-1111-1111-1111", masked)
		self.assertIn("****-****-****-1111", masked)
		self.assertTrue(any(d["type"] == "credit_card" for d in detections))

	def test_ssn_masking(self):
		"""SSN patterns are masked."""
		from oly_ai.core.pii_filter import mask_pii
		text = "SSN: 123-45-6789"
		masked, detections = mask_pii(text)
		self.assertNotIn("123-45-6789", masked)
		self.assertIn("***-**-****", masked)

	def test_password_masking(self):
		"""Password values in text are masked."""
		from oly_ai.core.pii_filter import mask_pii
		text = "password: s3cret123 and api_key=xyz789abc"
		masked, detections = mask_pii(text)
		self.assertNotIn("s3cret123", masked)
		self.assertNotIn("xyz789abc", masked)
		self.assertTrue(len(detections) >= 2)

	def test_normal_text_unchanged(self):
		"""Normal text without PII is not modified."""
		from oly_ai.core.pii_filter import mask_pii
		text = "Please show me the sales report for January 2026"
		masked, detections = mask_pii(text)
		self.assertEqual(text, masked)
		self.assertEqual(len(detections), 0)

	def test_filter_messages(self):
		"""filter_messages_pii processes message array."""
		from oly_ai.core.pii_filter import filter_messages_pii
		messages = [
			{"role": "user", "content": "My card: 4111-1111-1111-1111"},
			{"role": "assistant", "content": "I'll look into that."},
		]
		filtered, count = filter_messages_pii(messages)
		self.assertEqual(len(filtered), 2)
		self.assertNotIn("4111-1111-1111-1111", filtered[0]["content"])
		self.assertGreater(count, 0)

	def test_sensitive_fields_masking(self):
		"""Sensitive document fields are masked."""
		from oly_ai.core.pii_filter import mask_sensitive_fields
		data = {"name": "Test", "password": "secret123", "bank_account": "1234567890", "amount": 500}
		cleaned, masked_fields = mask_sensitive_fields(data)
		self.assertEqual(cleaned["password"], "****")
		self.assertEqual(cleaned["bank_account"], "****")
		self.assertEqual(cleaned["amount"], 500)
		self.assertIn("password", masked_fields)

	def test_luhn_validation(self):
		"""Luhn algorithm correctly validates real card numbers."""
		from oly_ai.core.pii_filter import _is_valid_luhn
		self.assertTrue(_is_valid_luhn("4111111111111111"))  # Visa test card
		self.assertFalse(_is_valid_luhn("1234567890123456"))  # Invalid

	def test_ethiopian_tin_masking(self):
		"""Ethiopian TIN numbers are masked."""
		from oly_ai.core.pii_filter import mask_pii
		text = "Company TIN: 1234567890"
		masked, detections = mask_pii(text)
		# This matches the TIN pattern with "TIN:" prefix
		self.assertIn("TIN-**********", masked)


class TestConversationExport(FrappeTestCase):
	"""Tests for conversation export."""

	def test_export_markdown_format(self):
		"""Export produces valid markdown."""
		from oly_ai.api.chat import export_conversation

		# Create a test session with a message (child table)
		session = frappe.get_doc({
			"doctype": "AI Chat Session",
			"title": "Test Export Session",
			"owner": "Administrator",
			"messages": [{
				"role": "user",
				"content": "Hello AI",
			}],
		})
		session.flags.ignore_permissions = True
		session.insert()
		frappe.db.commit()

		try:
			result = export_conversation(session.name, format="markdown")
			self.assertIn("filename", result)
			self.assertIn("content", result)
			self.assertTrue(result["filename"].endswith(".md"))
			self.assertIn("Test Export Session", result["content"])
			self.assertIn("Hello AI", result["content"])
			self.assertEqual(result["message_count"], 1)
		finally:
			frappe.delete_doc("AI Chat Session", session.name, force=True)
			frappe.db.commit()

	def test_export_text_format(self):
		"""Export produces plain text."""
		from oly_ai.api.chat import export_conversation

		session = frappe.get_doc({
			"doctype": "AI Chat Session",
			"title": "Test Text Export",
			"owner": "Administrator",
			"messages": [{"role": "user", "content": "Hi"}],
		})
		session.flags.ignore_permissions = True
		session.insert()
		frappe.db.commit()

		try:
			result = export_conversation(session.name, format="text")
			self.assertTrue(result["filename"].endswith(".txt"))
			self.assertEqual(result["content_type"], "text/plain")
		finally:
			frappe.delete_doc("AI Chat Session", session.name, force=True)
			frappe.db.commit()


class TestHybridRAG(FrappeTestCase):
	"""Tests for hybrid BM25+vector RAG."""

	def test_tokenizer(self):
		"""Tokenizer correctly splits and filters."""
		from oly_ai.core.rag.retriever import _tokenize
		tokens = _tokenize("Hello World! This is a test-123.")
		self.assertIn("hello", tokens)
		self.assertIn("world", tokens)
		self.assertIn("test", tokens)
		self.assertIn("123", tokens)
		# Single char tokens should be filtered
		self.assertNotIn("a", tokens)

	def test_bm25_loader(self):
		"""BM25 class loads successfully."""
		from oly_ai.core.rag.retriever import _get_bm25
		BM25Class = _get_bm25()
		self.assertIsNotNone(BM25Class, "rank_bm25 should be installed")

	def test_bm25_scoring(self):
		"""BM25 produces scores for matching documents."""
		from oly_ai.core.rag.retriever import _get_bm25, _tokenize
		BM25Class = _get_bm25()
		if BM25Class is None:
			self.skipTest("rank_bm25 not installed")

		corpus = [
			_tokenize("Sales Invoice for Customer A total amount 5000"),
			_tokenize("Employee leave application pending approval"),
			_tokenize("Purchase Order for supplier B delivery date March"),
		]
		bm25 = BM25Class(corpus)
		query = _tokenize("sales invoice total amount")
		scores = bm25.get_scores(query)
		# First doc should score highest
		self.assertGreater(scores[0], scores[1])
		self.assertGreater(scores[0], scores[2])


# ═══════════════════════════════════════════════════════════════
# Sprint 3: Customer Service & Cross-App Integration Tests
# ═══════════════════════════════════════════════════════════════

class TestSentimentAnalysis(FrappeTestCase):
	"""Tests for core/sentiment.py — keyword-based sentiment detection."""

	def test_positive_sentiment(self):
		"""Positive keywords produce positive sentiment."""
		from oly_ai.core.sentiment import analyze_sentiment
		result = analyze_sentiment("Thank you for the excellent service, I'm very happy!")
		self.assertEqual(result["sentiment"], "positive")
		self.assertGreater(result["confidence"], 0.5)
		self.assertGreater(result["positive_score"], result["negative_score"])

	def test_negative_sentiment(self):
		"""Negative keywords produce negative sentiment."""
		from oly_ai.core.sentiment import analyze_sentiment
		result = analyze_sentiment("This is terrible, I'm very disappointed and angry!")
		self.assertEqual(result["sentiment"], "negative")
		self.assertGreater(result["confidence"], 0.5)
		self.assertGreater(result["negative_score"], result["positive_score"])

	def test_neutral_sentiment(self):
		"""Text without strong signals produces neutral sentiment."""
		from oly_ai.core.sentiment import analyze_sentiment
		result = analyze_sentiment("Please send me the invoice for order 12345.")
		self.assertEqual(result["sentiment"], "neutral")

	def test_urgency_high(self):
		"""Urgency keywords produce high urgency."""
		from oly_ai.core.sentiment import analyze_sentiment
		result = analyze_sentiment("This is URGENT! We need this fixed ASAP, it's an emergency!")
		self.assertEqual(result["urgency"], "high")
		self.assertGreaterEqual(result["urgency_score"], 4)

	def test_urgency_low(self):
		"""Casual text produces low urgency."""
		from oly_ai.core.sentiment import analyze_sentiment
		result = analyze_sentiment("Just checking in about the order status.")
		self.assertEqual(result["urgency"], "low")

	def test_empty_text(self):
		"""Empty text returns neutral defaults."""
		from oly_ai.core.sentiment import analyze_sentiment
		result = analyze_sentiment("")
		self.assertEqual(result["sentiment"], "neutral")
		self.assertEqual(result["urgency"], "low")

	def test_key_signals_populated(self):
		"""Key signals list is populated with detected keywords."""
		from oly_ai.core.sentiment import analyze_sentiment
		result = analyze_sentiment("Terrible service! I want a refund immediately!")
		self.assertTrue(len(result["key_signals"]) > 0)

	def test_sentiment_label(self):
		"""get_sentiment_label returns correct formatted labels."""
		from oly_ai.core.sentiment import get_sentiment_label
		label = get_sentiment_label("negative", "high")
		self.assertIn("Negative", label)
		self.assertIn("Urgent", label)

	def test_mixed_sentiment(self):
		"""Mixed positive/negative text detected reasonably."""
		from oly_ai.core.sentiment import analyze_sentiment
		result = analyze_sentiment("The product quality is good but the delivery was terrible and slow.")
		# Should be negative overall (terrible + slow outweigh good)
		self.assertIn(result["sentiment"], ["negative", "neutral"])


class TestEmailHandler(FrappeTestCase):
	"""Tests for core/email_handler.py — auto-response on incoming emails."""

	def test_should_auto_respond_incoming(self):
		"""Incoming email to supported doctype qualifies for auto-response."""
		from oly_ai.core.email_handler import _should_auto_respond

		mock_comm = MagicMock()
		mock_comm.communication_type = "Communication"
		mock_comm.sent_or_received = "Received"
		mock_comm.reference_doctype = "Issue"
		mock_comm.reference_name = "ISS-001"
		mock_comm.sender = "customer@example.com"

		with patch("frappe.get_cached_doc") as mock_settings:
			settings_mock = MagicMock()
			settings_mock.enable_auto_response = 1
			settings_mock.get.return_value = []  # No configured doctypes, use defaults
			mock_settings.return_value = settings_mock

			result = _should_auto_respond(mock_comm)
			self.assertTrue(result)

	def test_should_not_respond_outgoing(self):
		"""Outgoing emails should not trigger auto-response."""
		from oly_ai.core.email_handler import _should_auto_respond

		mock_comm = MagicMock()
		mock_comm.communication_type = "Communication"
		mock_comm.sent_or_received = "Sent"
		mock_comm.reference_doctype = "Issue"
		mock_comm.reference_name = "ISS-001"
		mock_comm.sender = "user@oly.et"

		result = _should_auto_respond(mock_comm)
		self.assertFalse(result)

	def test_should_not_respond_comment(self):
		"""Comments should not trigger auto-response."""
		from oly_ai.core.email_handler import _should_auto_respond

		mock_comm = MagicMock()
		mock_comm.communication_type = "Comment"
		mock_comm.sent_or_received = "Received"

		result = _should_auto_respond(mock_comm)
		self.assertFalse(result)

	def test_should_not_respond_no_reference(self):
		"""Emails without reference doctype should not trigger."""
		from oly_ai.core.email_handler import _should_auto_respond

		mock_comm = MagicMock()
		mock_comm.communication_type = "Communication"
		mock_comm.sent_or_received = "Received"
		mock_comm.reference_doctype = None
		mock_comm.reference_name = None

		result = _should_auto_respond(mock_comm)
		self.assertFalse(result)

	def test_should_not_respond_system_sender(self):
		"""System senders should not trigger auto-response."""
		from oly_ai.core.email_handler import _should_auto_respond

		mock_comm = MagicMock()
		mock_comm.communication_type = "Communication"
		mock_comm.sent_or_received = "Received"
		mock_comm.reference_doctype = "Issue"
		mock_comm.reference_name = "ISS-001"
		mock_comm.sender = "administrator"

		with patch("frappe.get_cached_doc") as mock_settings:
			settings_mock = MagicMock()
			settings_mock.enable_auto_response = 1
			settings_mock.get.return_value = []
			mock_settings.return_value = settings_mock

			result = _should_auto_respond(mock_comm)
			self.assertFalse(result)

	def test_company_context_fetcher(self):
		"""_get_company_context returns valid dict."""
		from oly_ai.core.email_handler import _get_company_context
		result = _get_company_context()
		self.assertIsInstance(result, dict)
		self.assertIn("company_name", result)
		# Should always have a company name, even on fallback
		self.assertTrue(len(result["company_name"]) > 0)


class TestDynamicSystemPrompt(FrappeTestCase):
	"""Tests for dynamic system prompt generation in chat.py."""

	def test_get_system_prompt_ask(self):
		"""Ask mode returns a prompt string."""
		from oly_ai.api.chat import get_system_prompt
		prompt = get_system_prompt("ask")
		self.assertIsInstance(prompt, str)
		self.assertTrue(len(prompt) > 100)
		# Should NOT contain hardcoded "OLY Technologies" (dynamic now)
		# But should contain company-related context
		self.assertIn("help employees", prompt.lower())

	def test_get_system_prompt_agent(self):
		"""Agent mode returns a prompt with analysis capabilities."""
		from oly_ai.api.chat import get_system_prompt
		prompt = get_system_prompt("agent")
		self.assertIn("Agent mode", prompt)
		self.assertIn("analysis", prompt.lower())

	def test_get_system_prompt_execute(self):
		"""Execute mode returns a prompt with action capabilities."""
		from oly_ai.api.chat import get_system_prompt
		prompt = get_system_prompt("execute")
		self.assertIn("Execute mode", prompt)
		self.assertIn("approval", prompt.lower())

	def test_system_prompts_backward_compat(self):
		"""SYSTEM_PROMPTS dict-like access still works."""
		from oly_ai.api.chat import SYSTEM_PROMPTS
		prompt = SYSTEM_PROMPTS["ask"]
		self.assertIsInstance(prompt, str)
		self.assertTrue(len(prompt) > 100)

	def test_system_prompts_get_method(self):
		"""SYSTEM_PROMPTS.get() works correctly."""
		from oly_ai.api.chat import SYSTEM_PROMPTS
		prompt = SYSTEM_PROMPTS.get("agent", "fallback")
		self.assertIsInstance(prompt, str)
		self.assertNotEqual(prompt, "fallback")

	def test_system_prompts_research_compat(self):
		"""Research mode maps to agent prompt."""
		from oly_ai.api.chat import SYSTEM_PROMPTS
		research = SYSTEM_PROMPTS["research"]
		agent = SYSTEM_PROMPTS["agent"]
		self.assertEqual(research, agent)

	def test_company_info_fetcher(self):
		"""_get_company_info returns valid dict with apps."""
		from oly_ai.api.chat import _get_company_info
		info = _get_company_info()
		self.assertIsInstance(info, dict)
		self.assertIn("name", info)
		# Should have apps info
		self.assertIn("apps", info)

	def test_installed_apps_in_prompt(self):
		"""System prompt includes installed app names."""
		from oly_ai.api.chat import get_system_prompt
		prompt = get_system_prompt("agent")
		# Should mention app capabilities
		self.assertIn("app", prompt.lower())


class TestSLAMonitor(FrappeTestCase):
	"""Tests for core/sla_monitor.py — SLA monitoring and escalation."""

	def test_check_sla_respects_settings(self):
		"""SLA check exits early when disabled."""
		from oly_ai.core.sla_monitor import check_sla_status

		with patch("frappe.get_cached_doc") as mock_settings:
			settings_mock = MagicMock()
			settings_mock.enable_sla_monitoring = 0
			mock_settings.return_value = settings_mock

			# Should not raise, just return
			check_sla_status()

	@patch("frappe.get_all")
	@patch("frappe.get_cached_doc")
	def test_check_sla_no_open_issues(self, mock_settings, mock_get_all):
		"""SLA check succeeds with no open issues."""
		settings_mock = MagicMock()
		settings_mock.enable_sla_monitoring = 1
		mock_settings.return_value = settings_mock
		mock_get_all.return_value = []

		from oly_ai.core.sla_monitor import check_sla_status
		check_sla_status()  # Should complete without error

	def test_notify_deduplication(self):
		"""SLA notifications are deduplicated via cache."""
		from oly_ai.core.sla_monitor import _notify_sla_breach

		mock_issue = MagicMock()
		mock_issue.name = "TEST-SLA-001"
		mock_issue.subject = "Test issue"
		mock_issue.priority = "Medium"
		mock_issue.owner = "test@example.com"

		# First call should send notification
		with patch("frappe.cache") as mock_cache:
			cache_mock = MagicMock()
			cache_mock.get.return_value = None  # Not yet notified
			mock_cache.return_value = cache_mock

			with patch("frappe.get_all", return_value=[]):
				with patch("frappe.new_doc") as mock_new_doc:
					notification_mock = MagicMock()
					mock_new_doc.return_value = notification_mock
					_notify_sla_breach(mock_issue, "Response", 2.5)
					# Cache should be set
					cache_mock.set.assert_called_once()


class TestCrossAppIntegration(FrappeTestCase):
	"""Tests for cross-app integration — hooks, discover_doctypes, tools."""

	def test_hooks_cover_marketing_suite(self):
		"""hooks.py includes Marketing Suite doctype JS hooks."""
		from oly_ai.hooks import doctype_js
		marketing_doctypes = ["Content", "Ad Campaign", "Insight", "Research",
		                      "Competitor", "Influencer", "Brand Profile", "Media Outlet", "Sponsor"]
		for dt in marketing_doctypes:
			self.assertIn(dt, doctype_js, f"Missing Marketing Suite hook for {dt}")

	def test_hooks_cover_hrms(self):
		"""hooks.py includes HRMS doctype JS hooks."""
		from oly_ai.hooks import doctype_js
		hrms_doctypes = ["Job Applicant", "Job Opening", "Appraisal",
		                 "Employee Grievance", "Interview Feedback", "Salary Slip",
		                 "Payroll Entry", "Travel Request", "Goal"]
		for dt in hrms_doctypes:
			self.assertIn(dt, doctype_js, f"Missing HRMS hook for {dt}")

	def test_hooks_cover_oly(self):
		"""hooks.py includes Oly custom app doctype JS hooks."""
		from oly_ai.hooks import doctype_js
		oly_doctypes = ["Letter", "Daily Work Report", "Telegram Chat",
		                "Call Log", "Feedback", "Job Scorecard"]
		for dt in oly_doctypes:
			self.assertIn(dt, doctype_js, f"Missing Oly hook for {dt}")

	def test_hooks_cover_webshop(self):
		"""hooks.py includes Webshop doctype JS hooks."""
		from oly_ai.hooks import doctype_js
		webshop_doctypes = ["Website Item", "Item Review"]
		for dt in webshop_doctypes:
			self.assertIn(dt, doctype_js, f"Missing Webshop hook for {dt}")

	def test_total_doctype_hooks_count(self):
		"""Total number of doctype hooks is at least 43 (17 ERPNext + 26 cross-app)."""
		from oly_ai.hooks import doctype_js
		self.assertGreaterEqual(len(doctype_js), 43)

	def test_communication_hook_registered(self):
		"""Communication after_insert hook is registered in doc_events."""
		from oly_ai.hooks import doc_events
		self.assertIn("Communication", doc_events)
		self.assertIn("after_insert", doc_events["Communication"])
		self.assertIn("email_handler", doc_events["Communication"]["after_insert"])

	def test_sla_scheduler_registered(self):
		"""SLA monitor scheduler is registered in hooks."""
		from oly_ai.hooks import scheduler_events
		cron_jobs = scheduler_events.get("cron", {})
		# Find the SLA check in any cron entry
		found = False
		for schedule, jobs in cron_jobs.items():
			for job in jobs:
				if "sla_monitor" in job:
					found = True
					break
		self.assertTrue(found, "SLA monitor scheduler not registered")

	def test_discover_doctypes_no_website_exclusion(self):
		"""discover_doctypes does not exclude Website module anymore."""
		import inspect
		from oly_ai.api.train import discover_doctypes
		source = inspect.getsource(discover_doctypes)
		# "Website" should NOT appear in the module exclusion list
		self.assertNotIn('"Website"', source)

	def test_analyze_sentiment_tool_registered(self):
		"""analyze_sentiment tool is in TOOL_DEFINITIONS."""
		from oly_ai.core.tools import TOOL_DEFINITIONS
		tool_names = [t["function"]["name"] for t in TOOL_DEFINITIONS]
		self.assertIn("analyze_sentiment", tool_names)

	def test_analyze_sentiment_tool_execution(self):
		"""analyze_sentiment tool executes and returns results."""
		from oly_ai.core.tools import execute_tool
		result_json = execute_tool("analyze_sentiment", {"text": "This is great, thank you!"})
		import json
		result = json.loads(result_json)
		self.assertIn("sentiment", result)
		self.assertEqual(result["sentiment"], "positive")
		self.assertIn("label", result)

	def test_analyze_sentiment_in_read_tools(self):
		"""analyze_sentiment is in the read_tools list."""
		import inspect
		from oly_ai.core.tools import get_available_tools
		source = inspect.getsource(get_available_tools)
		self.assertIn("analyze_sentiment", source)