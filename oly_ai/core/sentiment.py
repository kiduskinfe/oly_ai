# Copyright (c) 2026, OLY Technologies and contributors
# Sentiment Analysis — keyword & pattern-based sentiment detection for Communications
# Used by email_handler for triage and by the analyze_sentiment tool

import re
from frappe.utils import cstr


# Sentiment keyword dictionaries (weighted)
_POSITIVE_WORDS = {
	# Strong positive (weight 2)
	"excellent": 2, "outstanding": 2, "amazing": 2, "wonderful": 2,
	"fantastic": 2, "exceptional": 2, "love": 2, "brilliant": 2,
	"perfect": 2, "superb": 2,
	# Moderate positive (weight 1)
	"good": 1, "great": 1, "happy": 1, "pleased": 1, "satisfied": 1,
	"helpful": 1, "thanks": 1, "thank": 1, "appreciate": 1,
	"well": 1, "nice": 1, "friendly": 1, "quick": 1, "efficient": 1,
	"resolved": 1, "impressed": 1, "recommend": 1, "smooth": 1,
}

_NEGATIVE_WORDS = {
	# Strong negative (weight 2)
	"terrible": 2, "horrible": 2, "awful": 2, "disgusting": 2,
	"unacceptable": 2, "worst": 2, "furious": 2, "outraged": 2,
	"scam": 2, "fraud": 2, "sue": 2, "lawyer": 2, "legal action": 2,
	# Moderate negative (weight 1)
	"bad": 1, "poor": 1, "disappointed": 1, "unhappy": 1, "angry": 1,
	"frustrat": 1, "annoyed": 1, "slow": 1, "broken": 1, "wrong": 1,
	"fail": 1, "error": 1, "issue": 1, "problem": 1, "complaint": 1,
	"delay": 1, "late": 1, "missing": 1, "damaged": 1, "defective": 1,
	"refund": 1, "cancel": 1, "return": 1, "never": 1, "useless": 1,
	"rude": 1, "unprofessional": 1, "incompetent": 1,
}

_URGENCY_WORDS = {
	# High urgency (weight 2)
	"urgent": 2, "asap": 2, "immediately": 2, "emergency": 2,
	"critical": 2, "deadline": 2, "overdue": 2, "escalate": 2,
	"right now": 2, "time-sensitive": 2,
	# Medium urgency (weight 1)
	"soon": 1, "quickly": 1, "priority": 1, "waiting": 1,
	"follow up": 1, "follow-up": 1, "still waiting": 1,
	"no response": 1, "pending": 1, "remind": 1, "reminder": 1,
	"how long": 1, "when will": 1, "expected": 1,
}

# Patterns that indicate strong emotions
_EMOTION_PATTERNS = [
	(r"!!+", "negative", 1),  # Multiple exclamation marks
	(r"\?\?+", "negative", 1),  # Multiple question marks
	(r"[A-Z]{4,}", "negative", 1),  # ALL CAPS words (shouting)
	(r":(|:\(|😡|😤|😢|💔", "negative", 1),  # Negative emojis/emoticons
	(r":)|:\)|😊|😀|👍|❤️|🙏", "positive", 1),  # Positive emojis/emoticons
]


def analyze_sentiment(text):
	"""Analyze the sentiment and urgency of a text message.

	Uses keyword matching with weighted scoring. Not as accurate
	as ML-based approaches, but works offline with zero dependencies.

	Args:
		text: The text to analyze

	Returns:
		dict: {
			"sentiment": "positive" | "negative" | "neutral",
			"confidence": float (0-1),
			"urgency": "high" | "medium" | "low",
			"urgency_score": float,
			"positive_score": int,
			"negative_score": int,
			"key_signals": list of detected keywords
		}
	"""
	if not text:
		return {
			"sentiment": "neutral",
			"confidence": 0.5,
			"urgency": "low",
			"urgency_score": 0,
			"positive_score": 0,
			"negative_score": 0,
			"key_signals": [],
		}

	text_lower = cstr(text).lower()
	words = set(re.findall(r'\b\w+\b', text_lower))
	key_signals = []

	# Score positive words
	positive_score = 0
	for word, weight in _POSITIVE_WORDS.items():
		if word in words or word in text_lower:
			positive_score += weight
			key_signals.append(f"+{word}")

	# Score negative words
	negative_score = 0
	for word, weight in _NEGATIVE_WORDS.items():
		if word in words or word in text_lower:
			negative_score += weight
			key_signals.append(f"-{word}")

	# Score urgency
	urgency_score = 0
	for word, weight in _URGENCY_WORDS.items():
		if word in words or word in text_lower:
			urgency_score += weight
			key_signals.append(f"!{word}")

	# Check emotion patterns
	for pattern, direction, weight in _EMOTION_PATTERNS:
		try:
			if re.search(pattern, text):
				if direction == "negative":
					negative_score += weight
				else:
					positive_score += weight
		except re.error:
			pass

	# Determine sentiment
	total = positive_score + negative_score
	if total == 0:
		sentiment = "neutral"
		confidence = 0.5
	elif positive_score > negative_score:
		sentiment = "positive"
		confidence = min(0.95, 0.5 + (positive_score - negative_score) / max(total, 1) * 0.5)
	elif negative_score > positive_score:
		sentiment = "negative"
		confidence = min(0.95, 0.5 + (negative_score - positive_score) / max(total, 1) * 0.5)
	else:
		sentiment = "neutral"
		confidence = 0.4  # Equal scores = low confidence neutral

	# Determine urgency level
	if urgency_score >= 4:
		urgency = "high"
	elif urgency_score >= 2:
		urgency = "medium"
	else:
		urgency = "low"

	return {
		"sentiment": sentiment,
		"confidence": round(confidence, 2),
		"urgency": urgency,
		"urgency_score": urgency_score,
		"positive_score": positive_score,
		"negative_score": negative_score,
		"key_signals": key_signals[:10],  # Limit to top 10 signals
	}


def get_sentiment_label(sentiment, urgency):
	"""Get a human-readable sentiment label with emoji.

	Args:
		sentiment: "positive", "negative", or "neutral"
		urgency: "high", "medium", or "low"

	Returns:
		str: e.g. "😊 Positive" or "🔴 Negative (Urgent)"
	"""
	labels = {
		"positive": "😊 Positive",
		"negative": "😟 Negative",
		"neutral": "😐 Neutral",
	}
	label = labels.get(sentiment, "😐 Neutral")

	if urgency == "high":
		label += " 🚨 Urgent"
	elif urgency == "medium":
		label += " ⏰ Follow-up needed"

	return label
