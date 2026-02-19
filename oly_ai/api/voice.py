# Copyright (c) 2026, OLY Technologies and contributors
# Voice API — Speech-to-Text (Whisper) and Text-to-Speech (OpenAI TTS)

import base64
import os
import tempfile

import frappe
import requests
from frappe import _


@frappe.whitelist()
def voice_to_text(audio_file=None):
	"""Convert an uploaded audio file to text using OpenAI Whisper.

	Accepts audio via Frappe file upload (multipart form).

	Returns:
		dict: {"text": str, "language": str}
	"""
	frappe.only_for("System Manager", "All")

	settings = frappe.get_cached_doc("AI Settings")
	api_key = settings.get_password("api_key")
	base_url = settings.get_base_url().rstrip("/")

	# Get the uploaded file from the request
	files = frappe.request.files
	if not files or "audio" not in files:
		frappe.throw(_("No audio file received"))

	audio = files["audio"]

	# Save to temp file (Whisper API needs a file)
	suffix = _get_ext(audio.filename or "audio.webm")
	tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
	try:
		audio.save(tmp)
		tmp.close()

		url = f"{base_url}/audio/transcriptions"
		headers = {"Authorization": f"Bearer {api_key}"}

		with open(tmp.name, "rb") as f:
			resp = requests.post(
				url,
				headers=headers,
				files={"file": (f"audio{suffix}", f, _mime_for(suffix))},
				data={"model": "whisper-1", "language": "en"},
				timeout=30,
			)
		resp.raise_for_status()
		data = resp.json()

		text = data.get("text", "").strip()
		if not text:
			frappe.throw(_("Could not transcribe audio. Please try again."))

		return {"text": text, "language": data.get("language", "en")}

	except requests.exceptions.HTTPError as e:
		detail = ""
		try:
			detail = e.response.json().get("error", {}).get("message", str(e))
		except Exception:
			detail = str(e)
		frappe.throw(_("Transcription error: {0}").format(detail))
	except Exception as e:
		frappe.throw(_("Transcription failed: {0}").format(str(e)))
	finally:
		try:
			os.unlink(tmp.name)
		except OSError:
			pass


@frappe.whitelist()
def text_to_speech(text, voice="alloy"):
	"""Convert text to speech using OpenAI TTS API.

	Args:
		text: Text to convert (max 4096 chars)
		voice: Voice name (alloy, echo, fable, onyx, nova, shimmer)

	Returns:
		dict: {"audio_base64": str, "content_type": "audio/mpeg"}
	"""
	frappe.only_for("System Manager", "All")

	if not text or not text.strip():
		frappe.throw(_("No text provided"))

	# Truncate to TTS limit
	text = text.strip()[:4096]

	settings = frappe.get_cached_doc("AI Settings")
	api_key = settings.get_password("api_key")
	base_url = settings.get_base_url().rstrip("/")

	url = f"{base_url}/audio/speech"
	headers = {
		"Authorization": f"Bearer {api_key}",
		"Content-Type": "application/json",
	}
	payload = {
		"model": "tts-1",
		"input": text,
		"voice": voice,
		"response_format": "mp3",
	}

	try:
		resp = requests.post(url, headers=headers, json=payload, timeout=30)
		resp.raise_for_status()

		audio_b64 = base64.b64encode(resp.content).decode("utf-8")
		return {
			"audio_base64": audio_b64,
			"content_type": "audio/mpeg",
		}

	except requests.exceptions.HTTPError as e:
		detail = ""
		try:
			detail = e.response.json().get("error", {}).get("message", str(e))
		except Exception:
			detail = str(e)
		frappe.throw(_("Text-to-speech error: {0}").format(detail))
	except Exception as e:
		frappe.throw(_("Text-to-speech failed: {0}").format(str(e)))


def _get_ext(filename):
	"""Get file extension from filename."""
	_, ext = os.path.splitext(filename)
	return ext or ".webm"


def _mime_for(ext):
	"""Get MIME type for audio extension."""
	return {
		".webm": "audio/webm",
		".ogg": "audio/ogg",
		".mp3": "audio/mpeg",
		".wav": "audio/wav",
		".m4a": "audio/m4a",
		".mp4": "audio/mp4",
	}.get(ext, "audio/webm")
