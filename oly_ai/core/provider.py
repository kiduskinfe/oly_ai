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

	def chat(self, messages, model=None, max_tokens=None, temperature=None, json_mode=False, tools=None):
		"""Send a chat completion request. Returns dict with response + usage metadata.

		Args:
			messages: list of {"role": "system"|"user"|"assistant", "content": "..."}
			model: override default model
			max_tokens: override default max tokens
			temperature: override default temperature
			json_mode: request JSON output format
			tools: list of tool definitions for function calling (OpenAI format)

		Returns:
			dict: {
				"content": str,          # AI response text (may be None if tool_calls)
				"model": str,            # model used
				"tokens_input": int,     # input tokens
				"tokens_output": int,    # output tokens
				"response_time": float,  # seconds
				"tool_calls": list|None, # tool calls if function calling
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
				messages, model, max_tokens, temperature, json_mode, tools
			)

		result["response_time"] = round(time.time() - start_time, 2)
		result["model"] = model
		return result

	def _call_openai_compatible(self, messages, model, max_tokens, temperature, json_mode=False, tools=None):
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

		if tools:
			payload["tools"] = tools
			payload["tool_choice"] = "auto"

		try:
			response = requests.post(url, headers=headers, json=payload, timeout=self.timeout)
			response.raise_for_status()
			data = response.json()

			msg = data["choices"][0]["message"]
			result = {
				"content": msg.get("content"),
				"tokens_input": data.get("usage", {}).get("prompt_tokens", 0),
				"tokens_output": data.get("usage", {}).get("completion_tokens", 0),
				"tool_calls": msg.get("tool_calls"),
			}
			return result
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

	def chat_stream(self, messages, model=None, max_tokens=None, temperature=None, tools=None):
		"""Stream chat completion, yielding chunks as they arrive.

		Yields dicts:
		  {"type": "chunk", "content": "..."}     — text content chunk
		  {"type": "tool_call_delta", "delta": {}} — tool call delta (if function calling)
		  {"type": "usage", "usage": {...}}        — usage stats from final chunk

		Args:
			messages: list of message dicts
			model: override model
			max_tokens: override max tokens
			temperature: override temperature
			tools: tool definitions for function calling
		"""
		model = model or self.default_model
		max_tokens = max_tokens or self.max_tokens
		temperature = temperature if temperature is not None else self.temperature

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
			"stream": True,
			"stream_options": {"include_usage": True},
		}

		if tools:
			payload["tools"] = tools
			payload["tool_choice"] = "auto"

		try:
			response = requests.post(
				url, headers=headers, json=payload,
				timeout=self.timeout, stream=True,
			)
			response.raise_for_status()

			for line in response.iter_lines():
				if not line:
					continue
				line_str = line.decode("utf-8")
				if not line_str.startswith("data: "):
					continue
				data_str = line_str[6:]
				if data_str.strip() == "[DONE]":
					break

				try:
					chunk = json.loads(data_str)
				except json.JSONDecodeError:
					continue

				# Usage in final chunk
				if chunk.get("usage"):
					yield {"type": "usage", "usage": chunk["usage"]}
					continue

				choices = chunk.get("choices", [])
				if not choices:
					continue

				delta = choices[0].get("delta", {})

				# Text content
				if delta.get("content"):
					yield {"type": "chunk", "content": delta["content"]}

				# Tool calls
				if delta.get("tool_calls"):
					yield {"type": "tool_call_delta", "delta": delta["tool_calls"]}

		except requests.exceptions.Timeout:
			raise Exception(f"AI request timed out after {self.timeout}s")
		except requests.exceptions.HTTPError as e:
			error_detail = ""
			try:
				error_detail = e.response.json().get("error", {}).get("message", str(e))
			except Exception:
				error_detail = str(e)
			raise Exception(f"AI API error: {error_detail}")

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

	def generate_image(self, prompt, model="dall-e-3", size="1024x1024", quality="standard", n=1):
		"""Generate an image using OpenAI's DALL-E API.

		Args:
			prompt: Text description of the image to generate
			model: Image model (dall-e-3 or dall-e-2)
			size: Image size (1024x1024, 1024x1792, 1792x1024)
			quality: Image quality (standard or hd) — dall-e-3 only
			n: Number of images (1 for dall-e-3, 1-10 for dall-e-2)

		Returns:
			dict: {
				"url": str,             # URL of generated image
				"revised_prompt": str,   # DALL-E 3's revised prompt
				"model": str,
				"size": str,
			}
		"""
		url = f"{self.base_url.rstrip('/')}/images/generations"

		headers = {
			"Content-Type": "application/json",
			"Authorization": f"Bearer {self.api_key}",
		}

		payload = {
			"model": model,
			"prompt": prompt,
			"n": n,
			"size": size,
		}
		if model == "dall-e-3":
			payload["quality"] = quality

		try:
			response = requests.post(url, headers=headers, json=payload, timeout=120)
			response.raise_for_status()
			data = response.json()

			image_data = data["data"][0]
			return {
				"url": image_data.get("url", ""),
				"revised_prompt": image_data.get("revised_prompt", prompt),
				"model": model,
				"size": size,
			}
		except requests.exceptions.HTTPError as e:
			error_detail = ""
			try:
				error_detail = e.response.json().get("error", {}).get("message", str(e))
			except Exception:
				error_detail = str(e)
			frappe.throw(f"Image generation error: {error_detail}")
		except Exception as e:
			frappe.throw(f"Image generation failed: {str(e)}")
