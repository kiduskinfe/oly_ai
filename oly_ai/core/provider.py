# Copyright (c) 2026, OLY Technologies and contributors
# Provider-agnostic LLM client — works with OpenAI, Anthropic, Ollama, vLLM, LiteLLM
# Swap providers by changing Settings only. Zero code changes.

import json
import time

import frappe
import requests


class LLMProvider:
	"""Provider-agnostic LLM client.

	Supports:
	- OpenAI (gpt-4o, gpt-4o-mini, etc.)
	- Anthropic (claude-3-5-sonnet, etc.)
	- Custom/Self-hosted (Ollama, vLLM, LiteLLM — any OpenAI-compatible endpoint)
	"""

	def __init__(self, settings=None):
		if settings is None:
			settings = frappe.get_cached_doc("AI Settings")
		self.settings = settings
		self.provider_type = settings.provider_type
		self.api_key = settings.get_password("api_key")
		self.base_url = settings.get_base_url()
		self.default_model = settings.default_model
		self.max_tokens = settings.max_tokens or 2048
		self.temperature = settings.temperature if settings.temperature is not None else 0.3
		self.top_p = settings.top_p if settings.top_p is not None else 1.0
		self.timeout = settings.timeout_seconds or 30

	def chat(self, messages, model=None, max_tokens=None, temperature=None, json_mode=False):
		"""Send a chat completion request. Returns dict with response + usage metadata.

		Args:
			messages: list of {"role": "system"|"user"|"assistant", "content": "..."}
			model: override default model
			max_tokens: override default max tokens
			temperature: override default temperature
			json_mode: request JSON output format

		Returns:
			dict: {
				"content": str,          # AI response text
				"model": str,            # model used
				"tokens_input": int,     # input tokens
				"tokens_output": int,    # output tokens
				"response_time": float,  # seconds
			}
		"""
		model = model or self.default_model
		max_tokens = max_tokens or self.max_tokens
		temperature = temperature if temperature is not None else self.temperature

		start_time = time.time()

		if self.provider_type == "Anthropic":
			result = self._call_anthropic(messages, model, max_tokens, temperature)
		else:
			# OpenAI and Custom (OpenAI-compatible) use the same API
			result = self._call_openai_compatible(
				messages, model, max_tokens, temperature, json_mode
			)

		result["response_time"] = round(time.time() - start_time, 2)
		result["model"] = model
		return result

	def _call_openai_compatible(self, messages, model, max_tokens, temperature, json_mode=False):
		"""Call OpenAI-compatible API (works with OpenAI, Ollama, vLLM, LiteLLM)."""
		url = f"{self.base_url.rstrip('/')}/chat/completions"

		headers = {
			"Content-Type": "application/json",
			"Authorization": f"Bearer {self.api_key}",
		}

		payload = {
			"model": model,
			"messages": messages,
			"max_tokens": max_tokens,
			"temperature": temperature,
			"top_p": self.top_p,
		}

		if json_mode:
			payload["response_format"] = {"type": "json_object"}

		try:
			response = requests.post(url, headers=headers, json=payload, timeout=self.timeout)
			response.raise_for_status()
			data = response.json()

			return {
				"content": data["choices"][0]["message"]["content"],
				"tokens_input": data.get("usage", {}).get("prompt_tokens", 0),
				"tokens_output": data.get("usage", {}).get("completion_tokens", 0),
			}
		except requests.exceptions.Timeout:
			frappe.throw(f"AI request timed out after {self.timeout}s. Try again or increase timeout.")
		except requests.exceptions.HTTPError as e:
			error_detail = ""
			try:
				error_detail = e.response.json().get("error", {}).get("message", str(e))
			except Exception:
				error_detail = str(e)
			frappe.throw(f"AI API error: {error_detail}")
		except Exception as e:
			frappe.throw(f"AI request failed: {str(e)}")

	def _call_anthropic(self, messages, model, max_tokens, temperature):
		"""Call Anthropic Claude API (different format from OpenAI)."""
		url = f"{self.base_url.rstrip('/')}/v1/messages"

		headers = {
			"Content-Type": "application/json",
			"x-api-key": self.api_key,
			"anthropic-version": "2023-06-01",
		}

		# Separate system message from conversation
		system_text = ""
		conversation = []
		for msg in messages:
			if msg["role"] == "system":
				system_text += msg["content"] + "\n"
			else:
				conversation.append(msg)

		payload = {
			"model": model,
			"max_tokens": max_tokens,
			"temperature": temperature,
			"top_p": self.top_p,
			"messages": conversation,
		}
		if system_text.strip():
			payload["system"] = system_text.strip()

		try:
			response = requests.post(url, headers=headers, json=payload, timeout=self.timeout)
			response.raise_for_status()
			data = response.json()

			content = ""
			for block in data.get("content", []):
				if block.get("type") == "text":
					content += block["text"]

			return {
				"content": content,
				"tokens_input": data.get("usage", {}).get("input_tokens", 0),
				"tokens_output": data.get("usage", {}).get("output_tokens", 0),
			}
		except requests.exceptions.Timeout:
			frappe.throw(f"AI request timed out after {self.timeout}s. Try again or increase timeout.")
		except requests.exceptions.HTTPError as e:
			error_detail = ""
			try:
				error_detail = e.response.json().get("error", {}).get("message", str(e))
			except Exception:
				error_detail = str(e)
			frappe.throw(f"Anthropic API error: {error_detail}")
		except Exception as e:
			frappe.throw(f"Anthropic request failed: {str(e)}")

	def get_embeddings(self, texts, model=None):
		"""Get embeddings for a list of texts. Returns list of embedding vectors.

		Works with OpenAI embeddings API and compatible endpoints.
		"""
		settings = self.settings
		embed_model = model or settings.embedding_model
		if not embed_model:
			frappe.throw("Embedding model not configured in AI Settings")

		embed_url = settings.embedding_base_url or self.base_url
		url = f"{embed_url.rstrip('/')}/embeddings"

		headers = {
			"Content-Type": "application/json",
			"Authorization": f"Bearer {self.api_key}",
		}

		payload = {
			"model": embed_model,
			"input": texts if isinstance(texts, list) else [texts],
		}

		try:
			response = requests.post(url, headers=headers, json=payload, timeout=self.timeout)
			response.raise_for_status()
			data = response.json()
			return [item["embedding"] for item in data["data"]]
		except Exception as e:
			frappe.throw(f"Embedding request failed: {str(e)}")
