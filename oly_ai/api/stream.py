# Copyright (c) 2026, OLY Technologies and contributors
# Streaming API — Real-time token streaming via Frappe Socket.IO
# Uses frappe.publish_realtime to push tokens to the client as they arrive.

import json
import time
import uuid

import frappe
from frappe import _

from oly_ai.core.provider import LLMProvider
from oly_ai.core.cost_tracker import check_budget, track_usage


def _is_model_unavailable_error(exc):
	"""Return True if exception indicates invalid/inaccessible model."""
	msg = str(exc).lower()
	if "model" not in msg:
		return False
	keywords = [
		"does not exist", "do not have access", "invalid model", "unknown model",
		"not found", "not a chat model", "not supported", "did you mean",
		"decommissioned", "deprecated",
	]
	return any(k in msg for k in keywords)


def _get_fallback_model(requested_model, settings):
	fallback = settings.default_model or "gpt-4o-mini"
	if fallback == requested_model:
		return None
	return fallback


@frappe.whitelist()
def send_message_stream(session_name, message, model=None, mode=None, file_urls=None):
	"""Send a message and stream the response via realtime events.

	Instead of waiting for the full response, this returns immediately with a task_id.
	The actual LLM call runs in the background, streaming tokens via frappe.publish_realtime.

	Client should listen for:
	  - "ai_chunk"  → {"task_id", "chunk"}    — each token/chunk of text
	  - "ai_done"   → {"task_id", "content", "model", "cost", ...}  — final result
	  - "ai_error"  → {"task_id", "error"}    — error occurred

	Returns:
		dict: {"task_id", "session_name"}
	"""
	user = frappe.session.user

	# Verify ownership
	session_user = frappe.db.get_value("AI Chat Session", session_name, "user")
	if not session_user:
		frappe.throw(_("Chat session not found"), frappe.DoesNotExistError)
	if session_user != user and user != "Administrator":
		frappe.throw(_("Access denied"), frappe.PermissionError)

	# Check AI is configured
	settings = frappe.get_cached_doc("AI Settings")
	if not settings.is_configured():
		frappe.throw(_("AI is not configured. Please set up AI Settings."))

	# Budget check
	allowed, reason = check_budget(user)
	if not allowed:
		frappe.throw(_(reason))

	task_id = str(uuid.uuid4())[:12]
	mode = mode or "ask"
	model = model or settings.default_model

	# Add user message to session first
	session = frappe.get_doc("AI Chat Session", session_name)
	session.append("messages", {"role": "user", "content": message})

	# Auto-title from first user message
	if session.title == "New Chat" and len([m for m in session.messages if m.role == "user"]) == 1:
		session.title = message[:60] + ("..." if len(message) > 60 else "")

	session.flags.ignore_permissions = True
	session.save()
	frappe.db.commit()

	# Enqueue the streaming job
	frappe.enqueue(
		"oly_ai.api.stream._process_stream",
		queue="short",
		timeout=120,
		task_id=task_id,
		session_name=session_name,
		message=message,
		model=model,
		mode=mode,
		user=user,
		file_urls=file_urls,
	)

	return {
		"task_id": task_id,
		"session_name": session_name,
		"session_title": session.title,
	}


def _process_stream(task_id, session_name, message, model, mode, user, file_urls=None):
	"""Background job: stream LLM response via realtime events."""
	import os
	import base64
	import mimetypes

	try:
		frappe.set_user(user)
		settings = frappe.get_cached_doc("AI Settings")
		session = frappe.get_doc("AI Chat Session", session_name)

		# Build conversation history (last 20 messages)
		conversation = []
		for msg in session.messages[-20:]:
			conversation.append({"role": msg.role, "content": msg.content})

		# Access control check
		try:
			from oly_ai.core.access_control import check_mode_access
			check_mode_access(user, mode)
		except frappe.PermissionError:
			frappe.publish_realtime(
				"ai_error",
				{"task_id": task_id, "error": "Access denied for this mode"},
				user=user,
			)
			return
		except Exception:
			pass

		# System prompt
		try:
			from oly_ai.api.chat import SYSTEM_PROMPTS
		except ImportError:
			SYSTEM_PROMPTS = None

		if not SYSTEM_PROMPTS:
			SYSTEM_PROMPTS = {
				"ask": "You are an AI assistant for ERPNext ERP system at OLY Technologies. Be concise and helpful. Format responses with markdown when helpful.",
				"research": "You are a deep research AI for OLY Technologies' ERPNext system. Conduct thorough analysis and produce comprehensive research reports.",
				"agent": "You are an advanced AI agent for OLY Technologies' ERPNext system. Think step-by-step, analyze deeply, and provide comprehensive solutions.",
				"execute": "You are an AI execution assistant for OLY Technologies' ERPNext. Generate precise, actionable execution plans for tasks in ERPNext.",
			}
		system_prompt = SYSTEM_PROMPTS.get(mode, SYSTEM_PROMPTS["ask"])

		# RAG context
		rag_context = ""
		sources = []
		try:
			from oly_ai.core.rag.retriever import build_rag_context
			rag_context, sources = build_rag_context(message, top_k=5, min_score=0.7)
		except Exception:
			pass

		# Build LLM messages
		llm_messages = [{"role": "system", "content": system_prompt}]
		if rag_context:
			llm_messages.append({
				"role": "system",
				"content": f"Relevant company documents:\n\n{rag_context}",
			})

		# Memory: include conversation summary if available
		try:
			from oly_ai.core.memory import get_session_context
			memory_messages = get_session_context(session)
			llm_messages.extend(memory_messages)
		except Exception:
			llm_messages.extend(conversation)

		# Handle file uploads for vision
		if file_urls:
			try:
				parsed_files = json.loads(file_urls) if isinstance(file_urls, str) else file_urls
				if parsed_files:
					from oly_ai.api.chat import _build_multipart_content
					last_user_content = _build_multipart_content(message, parsed_files)
					for i in range(len(llm_messages) - 1, -1, -1):
						if llm_messages[i].get("role") == "user":
							llm_messages[i]["content"] = last_user_content
							break
			except Exception:
				pass

		# Get tools for agent/execute modes
		tools = None
		try:
			from oly_ai.core.tools import get_available_tools
			tool_list = get_available_tools(user=user, mode=mode)
			if tool_list:
				tools = tool_list
		except Exception:
			pass

		provider = LLMProvider(settings)
		start_time = time.time()
		requested_model = model

		# If tools are available, we can't stream the tool-calling loop easily.
		# Fall back to non-streaming for tool calling rounds, stream the final response.
		if tools:
			try:
				_process_with_tools(
					task_id, provider, llm_messages, model, tools,
					user, session, session_name, sources, start_time, mode,
				)
				return
			except Exception as e:
				fallback = _get_fallback_model(model, settings)
				if fallback and _is_model_unavailable_error(e):
					_process_with_tools(
						task_id, provider, llm_messages, fallback, tools,
						user, session, session_name, sources, start_time, mode,
						requested_model=requested_model,
					)
					return
				raise

		# Stream the response
		full_content = ""
		tokens_input = 0
		tokens_output = 0

		def _run_stream(cur_model):
			full = ""
			t_in = 0
			t_out = 0
			for event in provider.chat_stream(llm_messages, model=cur_model):
				if event["type"] == "chunk":
					full += event["content"]
					frappe.publish_realtime(
						"ai_chunk",
						{"task_id": task_id, "chunk": event["content"]},
						user=user,
					)
				elif event["type"] == "usage":
					t_in = event["usage"].get("prompt_tokens", 0)
					t_out = event["usage"].get("completion_tokens", 0)
			return full, t_in, t_out

		try:
			full_content, tokens_input, tokens_output = _run_stream(model)
		except Exception as e:
			fallback = _get_fallback_model(model, settings)
			if fallback and _is_model_unavailable_error(e):
				model = fallback
				full_content, tokens_input, tokens_output = _run_stream(model)
				full_content = (
					f"⚠️ Requested model '{requested_model}' is not available for this API key/provider. "
					f"Used '{model}' instead.\n\n" + full_content
				)
			else:
				frappe.publish_realtime(
					"ai_error",
					{"task_id": task_id, "error": str(e)},
					user=user,
				)
				return

		response_time = round(time.time() - start_time, 2)
		cost = track_usage(model, tokens_input, tokens_output, user)

		# Save assistant message to session
		session.reload()
		session.append("messages", {
			"role": "assistant",
			"content": full_content,
			"model": model,
			"tokens_input": tokens_input,
			"tokens_output": tokens_output,
			"cost": cost,
			"response_time": response_time,
		})
		session.total_tokens = (session.total_tokens or 0) + tokens_input + tokens_output
		session.total_cost = (session.total_cost or 0) + cost
		session.flags.ignore_permissions = True
		session.save()
		frappe.db.commit()

		# Summarize session if it's getting long
		try:
			from oly_ai.core.memory import maybe_summarize_session
			maybe_summarize_session(session)
		except Exception:
			pass

		# Send done event
		frappe.publish_realtime(
			"ai_done",
			{
				"task_id": task_id,
				"content": full_content,
				"model": model,
				"cost": cost,
				"tokens": tokens_input + tokens_output,
				"response_time": response_time,
				"sources": sources,
				"session_title": session.title,
			},
			user=user,
		)

	except Exception as e:
		frappe.publish_realtime(
			"ai_error",
			{"task_id": task_id, "error": str(e)},
			user=user,
		)
		frappe.log_error(f"Stream error: {e}", "AI Stream")


def _process_with_tools(task_id, provider, llm_messages, model, tools, user, session, session_name, sources, start_time, mode, requested_model=None):
	"""Handle tool-calling flow: run tool rounds non-streamed, then stream the final response."""
	from oly_ai.core.tools import execute_tool

	MAX_TOOL_ROUNDS = 5
	total_input_tokens = 0
	total_output_tokens = 0
	pending_actions = []

	for _round in range(MAX_TOOL_ROUNDS):
		result = provider.chat(llm_messages, model=model, tools=tools)
		total_input_tokens += result.get("tokens_input", 0)
		total_output_tokens += result.get("tokens_output", 0)

		tool_calls = result.get("tool_calls")
		if not tool_calls:
			# No more tool calls — stream this final text content
			final_content = result.get("content") or ""

			# Send as streamed chunks (simulate streaming for consistent UX)
			chunk_size = 4
			words = final_content.split(" ")
			for i in range(0, len(words), chunk_size):
				chunk = " ".join(words[i:i + chunk_size])
				if i > 0:
					chunk = " " + chunk
				frappe.publish_realtime(
					"ai_chunk",
					{"task_id": task_id, "chunk": chunk},
					user=user,
				)
				time.sleep(0.02)  # Small delay for smooth rendering
			break

		# Process tool calls
		assistant_msg = {"role": "assistant", "content": result.get("content")}
		if tool_calls:
			assistant_msg["tool_calls"] = tool_calls

			# Notify client about tool usage
			for tc in tool_calls:
				frappe.publish_realtime(
					"ai_tool_call",
					{
						"task_id": task_id,
						"tool_name": tc["function"]["name"],
						"arguments": tc["function"]["arguments"],
					},
					user=user,
				)

		llm_messages.append(assistant_msg)

		for tc in tool_calls:
			fn_name = tc["function"]["name"]
			try:
				fn_args = json.loads(tc["function"]["arguments"])
			except json.JSONDecodeError:
				fn_args = {}

			tool_result = execute_tool(fn_name, fn_args, user=user)

			# Check for pending action
			try:
				parsed_result = json.loads(tool_result)
				if parsed_result.get("status") == "pending_approval":
					action_id = parsed_result.get("action_id")
					if action_id:
						frappe.db.set_value("AI Action Request", action_id, "session", session_name)
						frappe.db.commit()
					pending_actions.append(parsed_result)
			except (json.JSONDecodeError, TypeError):
				pass

			llm_messages.append({
				"role": "tool",
				"tool_call_id": tc["id"],
				"content": tool_result,
			})
	else:
		final_content = result.get("content") or ""

	response_time = round(time.time() - start_time, 2)
	cost = track_usage(model, total_input_tokens, total_output_tokens, user)
	if requested_model and requested_model != model:
		final_content = (
			f"⚠️ Requested model '{requested_model}' is not available for this API key/provider. "
			f"Used '{model}' instead.\n\n" + final_content
		)

	# Save to session
	session.reload()
	session.append("messages", {
		"role": "assistant",
		"content": final_content,
		"model": model,
		"tokens_input": total_input_tokens,
		"tokens_output": total_output_tokens,
		"cost": cost,
		"response_time": response_time,
	})
	session.total_tokens = (session.total_tokens or 0) + total_input_tokens + total_output_tokens
	session.total_cost = (session.total_cost or 0) + cost
	session.flags.ignore_permissions = True
	session.save()
	frappe.db.commit()

	# Send done event
	frappe.publish_realtime(
		"ai_done",
		{
			"task_id": task_id,
			"content": final_content,
			"model": model,
			"cost": cost,
			"tokens": total_input_tokens + total_output_tokens,
			"response_time": response_time,
			"sources": sources,
			"session_title": session.title,
			"pending_actions": pending_actions if pending_actions else None,
		},
		user=user,
	)
