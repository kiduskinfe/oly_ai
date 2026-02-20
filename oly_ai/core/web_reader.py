# Copyright (c) 2026, OLY Technologies and contributors
# Web Reader — Fetch and extract clean text from web pages.
# Used by the read_webpage tool to give AI access to URL content.

import re

import frappe
import requests
from bs4 import BeautifulSoup

# Safety limits
MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5 MB max download
MAX_TEXT_CHARS = 30_000  # Max chars returned to LLM
REQUEST_TIMEOUT = 15  # seconds
BLOCKED_EXTENSIONS = {".exe", ".zip", ".tar", ".gz", ".rar", ".7z", ".iso",
                      ".bin", ".dmg", ".pkg", ".deb", ".rpm", ".msi",
                      ".mp3", ".mp4", ".avi", ".mov", ".wav", ".flac"}
BLOCKED_DOMAINS = {"localhost", "127.0.0.1", "0.0.0.0", "169.254.169.254",
                   "[::1]", "metadata.google.internal"}


def read_webpage(url):
	"""Fetch a URL and extract clean readable text.

	Args:
		url: The URL to fetch

	Returns:
		dict: {url, title, text, word_count, truncated} or {error}
	"""
	url = (url or "").strip()
	if not url:
		return {"error": "URL is required"}

	# Validate URL
	if not url.startswith(("http://", "https://")):
		url = "https://" + url

	# Block dangerous targets
	try:
		from urllib.parse import urlparse
		parsed = urlparse(url)
		hostname = parsed.hostname or ""
		if hostname in BLOCKED_DOMAINS or hostname.endswith(".local"):
			return {"error": "Access to internal/local URLs is not allowed"}

		# Block non-web extensions
		path_lower = parsed.path.lower()
		for ext in BLOCKED_EXTENSIONS:
			if path_lower.endswith(ext):
				return {"error": f"Binary file downloads are not supported ({ext})"}
	except Exception:
		return {"error": "Invalid URL format"}

	try:
		headers = {
			"User-Agent": "Mozilla/5.0 (compatible; OlyAI/1.0; +https://oly.et)",
			"Accept": "text/html,application/xhtml+xml,text/plain,application/json",
			"Accept-Language": "en-US,en;q=0.9",
		}

		response = requests.get(
			url,
			headers=headers,
			timeout=REQUEST_TIMEOUT,
			allow_redirects=True,
			stream=True,
		)
		response.raise_for_status()

		# Check content type — only process text-based content
		content_type = response.headers.get("content-type", "").lower()
		if not any(t in content_type for t in ("text/", "application/json", "application/xml", "application/xhtml")):
			return {"error": f"Unsupported content type: {content_type}. Only text/HTML pages are supported."}

		# Read with size limit
		content = response.content[:MAX_CONTENT_LENGTH]
		charset = response.apparent_encoding or "utf-8"
		html = content.decode(charset, errors="replace")

		# Parse with BeautifulSoup
		soup = BeautifulSoup(html, "html.parser")

		# Extract title
		title = ""
		if soup.title and soup.title.string:
			title = soup.title.string.strip()

		# Remove non-content elements
		for tag in soup.find_all(["script", "style", "nav", "footer", "header",
		                          "aside", "iframe", "noscript", "svg", "form"]):
			tag.decompose()

		# Try to find main content area
		main = (
			soup.find("main")
			or soup.find("article")
			or soup.find("div", {"role": "main"})
			or soup.find("div", class_=re.compile(r"content|article|post|entry", re.I))
		)

		target = main if main else soup.body if soup.body else soup

		# Extract text with structure
		text = _extract_structured_text(target)

		# Truncate if needed
		truncated = len(text) > MAX_TEXT_CHARS
		if truncated:
			text = text[:MAX_TEXT_CHARS] + "\n\n... [content truncated]"

		word_count = len(text.split())

		return {
			"url": url,
			"title": title,
			"text": text,
			"word_count": word_count,
			"truncated": truncated,
		}

	except requests.exceptions.Timeout:
		return {"error": f"Request timed out after {REQUEST_TIMEOUT}s"}
	except requests.exceptions.ConnectionError:
		return {"error": "Could not connect to the URL"}
	except requests.exceptions.HTTPError as e:
		return {"error": f"HTTP error: {e.response.status_code}"}
	except Exception as e:
		frappe.logger("oly_ai").warning(f"Web reader failed for {url}: {e}")
		return {"error": f"Failed to read page: {str(e)}"}


def _extract_structured_text(element):
	"""Extract text from HTML while preserving basic structure.

	Keeps headings, paragraphs, and list items with appropriate formatting.
	"""
	parts = []

	for child in element.children:
		if isinstance(child, str):
			text = child.strip()
			if text:
				parts.append(text)
			continue

		if not hasattr(child, "name"):
			continue

		tag = child.name

		if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
			level = int(tag[1])
			prefix = "#" * level
			text = child.get_text(strip=True)
			if text:
				parts.append(f"\n{prefix} {text}\n")

		elif tag == "p":
			text = child.get_text(strip=True)
			if text:
				parts.append(f"\n{text}\n")

		elif tag in ("ul", "ol"):
			for i, li in enumerate(child.find_all("li", recursive=False), 1):
				text = li.get_text(strip=True)
				if text:
					bullet = f"{i}." if tag == "ol" else "-"
					parts.append(f"  {bullet} {text}")

		elif tag == "table":
			parts.append(_extract_table(child))

		elif tag in ("pre", "code"):
			text = child.get_text()
			if text.strip():
				parts.append(f"\n```\n{text.strip()}\n```\n")

		elif tag == "blockquote":
			text = child.get_text(strip=True)
			if text:
				parts.append(f"\n> {text}\n")

		elif tag == "a":
			text = child.get_text(strip=True)
			href = child.get("href", "")
			if text and href and href.startswith("http"):
				parts.append(f"[{text}]({href})")
			elif text:
				parts.append(text)

		elif tag in ("br",):
			parts.append("\n")

		elif tag in ("div", "section", "span", "td", "th", "li", "dd", "dt"):
			# Recurse into container elements
			inner = _extract_structured_text(child)
			if inner.strip():
				parts.append(inner)

		else:
			text = child.get_text(strip=True)
			if text:
				parts.append(text)

	result = "\n".join(parts)
	# Clean up excessive whitespace
	result = re.sub(r"\n{3,}", "\n\n", result)
	return result.strip()


def _extract_table(table):
	"""Extract a table as markdown."""
	rows = []
	for tr in table.find_all("tr"):
		cells = []
		for td in tr.find_all(["td", "th"]):
			cells.append(td.get_text(strip=True).replace("|", "\\|"))
		if cells:
			rows.append("| " + " | ".join(cells) + " |")

	if not rows:
		return ""

	# Add separator after first row (header)
	if len(rows) > 1:
		cols = rows[0].count("|") - 1
		separator = "| " + " | ".join(["---"] * max(cols, 1)) + " |"
		rows.insert(1, separator)

	return "\n" + "\n".join(rows) + "\n"
