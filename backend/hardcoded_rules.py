"""
hardcoded_rules.py
==================
STEP 1 of the hybrid logic — static keyword → reply map.

FIXED VERSION. The previous version used naive substring matching
(`kw in text`), which caused tiny keywords like "hi" to match inside words
like "WiFi", "this", "connectivity" — hijacking real questions and returning
the wrong canned reply. This version:

  1. Uses WHOLE-WORD / PHRASE matching (regex word boundaries), not substring.
  2. Makes greetings STRICT — they only fire if the message is essentially
     just a greeting, not any message that happens to contain "hi".
  3. Removes dangerous tiny/common keywords so open-ended questions fall
     through to the LLM (which can actually answer them).
  4. Keeps language mirroring (en / hi / hinglish).

Public API (unchanged — main.py needs no edits):
    detect_language(message) -> "en" | "hi" | "hinglish"
    match_rule(message)      -> str | None
"""

import re
from typing import Optional


# ---------------------------------------------------------------------------
# 1. Language detector
# ---------------------------------------------------------------------------

_DEVANAGARI_RE = re.compile(r"[\u0900-\u097F]")

# Romanized-Hindi marker words. NOTE: we intentionally DROP ultra-common
# ambiguous tokens (ho, ke, ki, ka, se, pe, ji, hi...) that also appear inside
# English text, to avoid misdetection. Keep only strong Hindi signals.
_HINGLISH_MARKERS = {
    "kaise", "kya", "hai", "hain", "hoon", "nahi", "nahin", "karo", "kar",
    "mujhe", "aap", "kyun", "kyunki", "theek", "accha", "achha", "acha",
    "batao", "bata", "chahiye", "madad", "raha", "rahi", "kaun", "bolo",
    "mera", "meri", "tera", "teri", "yahan", "wahan", "kitna", "kitne",
    "hoga", "kab", "kuch", "abhi", "sirf", "bahut", "thoda", "thodi",
    "pehle", "baad", "agar", "krte", "karte", "karna", "karni", "skte",
    "sakte", "sakti", "gaya", "gayi", "raha", "lagta", "milega",
}


def detect_language(message: str) -> str:
    """Return 'hi' (Devanagari), 'hinglish' (romanized Hindi), or 'en'."""
    if _DEVANAGARI_RE.search(message):
        return "hi"
    tokens = set(re.findall(r"[a-zA-Z]+", message.lower()))
    if tokens & _HINGLISH_MARKERS:
        return "hinglish"
    return "en"


# ---------------------------------------------------------------------------
# 2. Helpers for safe matching
# ---------------------------------------------------------------------------

def _has_phrase(text: str, phrase: str) -> bool:
    """
    Whole-word / whole-phrase match using regex boundaries.
    'login' matches 'login' and 'my login' but NOT 'logical'.
    Works for multi-word phrases too ('forgot password').
    """
    pattern = r"(?<![a-zA-Z0-9])" + re.escape(phrase.lower()) + r"(?![a-zA-Z0-9])"
    return re.search(pattern, text) is not None


def _is_pure_greeting(text: str) -> bool:
    """
    True only if the WHOLE message is essentially just a greeting.
    Prevents 'hi' from firing on long questions.
    """
    cleaned = re.sub(r"[^a-zA-Z\u0900-\u097F ]", "", text).strip().lower()
    greetings = {
        "hi", "hello", "hey", "hii", "hiii", "yo", "namaste", "namaskar",
        "hi arya", "hello arya", "hey arya", "namaste arya",
        "good morning", "good afternoon", "good evening",
        "नमस्ते", "नमस्कार", "हेलो", "हाय",
    }
    if cleaned in greetings:
        return True
    # also allow "<greeting> arya" / "<greeting> there"
    words = cleaned.split()
    if 1 <= len(words) <= 2 and words[0] in {
        "hi", "hello", "hey", "namaste", "namaskar", "yo", "नमस्ते", "नमस्कार"
    }:
        return True
    return False


# ---------------------------------------------------------------------------
# 3. Rules — each has reply_en / reply_hi / reply_hinglish
# ---------------------------------------------------------------------------
# Keywords are now matched as WHOLE WORDS/PHRASES. Tiny ambiguous words removed.
# Order matters: most specific first. Greeting is handled separately (strict).

RULES: list[dict] = [
{
    "keywords": [
        "who are you",
        "what are you",
        "your name",
        "introduce yourself",
        "kaun ho",
        "tum kaun ho",
        "aap kaun ho",
        "आप कौन हो",
        "अपना परिचय दो"
    ],

    "reply_en":
        "Hello! I am Arya, your AI assistant and technical guide. I can help with networking, Linux, Windows, servers, AI, programming, and technology-related questions.",

    "reply_hi":
        "नमस्ते! मैं आर्या हूँ, आपका AI सहायक और तकनीकी मार्गदर्शक। मैं नेटवर्किंग, लिनक्स, विंडोज, सर्वर, AI, प्रोग्रामिंग और तकनीकी प्रश्नों में आपकी सहायता कर सकता हूँ।",

    "reply_hinglish":
        "Hello! Main Arya hoon, aapka AI assistant aur technical guide. Main networking, Linux, Windows, servers, AI, programming aur technology-related questions me madad kar sakta hoon."
},

{
    "keywords": [
        "thank you",
        "thanks",
        "thankyou",
        "shukriya",
        "dhanyavaad",
        "dhanyawad",
        "धन्यवाद",
        "शुक्रिया"
    ],

    "reply_en":
        "You're welcome. Happy to help.",

    "reply_hi":
        "आपका स्वागत है। सहायता करके खुशी हुई।",

    "reply_hinglish":
        "Aapka swagat hai. Madad karke khushi hui."
},

{
    "keywords": [
        "bye",
        "goodbye",
        "see you",
        "alvida",
        "phir milenge",
        "अलविदा",
        "फिर मिलेंगे"
    ],

    "reply_en":
        "Goodbye. Feel free to come back anytime.",

    "reply_hi":
        "अलविदा। कभी भी सहायता चाहिए हो तो वापस आइए।",

    "reply_hinglish":
        "Alvida. Jab bhi madad chahiye ho wapas aa jana."
}

]


# ---------------------------------------------------------------------------
# 4. match_rule — whole-word, strict, language-aware
# ---------------------------------------------------------------------------

def _pick(rule: dict, lang: str) -> str:
    if lang == "hi":
        return rule["reply_hi"]
    if lang == "hinglish":
        return rule["reply_hinglish"]
    return rule["reply_en"]


def match_rule(message: str) -> Optional[str]:
    """
    Returns a canned reply ONLY for clear, unambiguous cases:
      - pure greetings (strict)
      - menu buttons / strong intent phrases (whole-word match)
    Everything else returns None → falls through to the LLM.

    Return contract unchanged: str | None.
    """
    lang = detect_language(message)
    text = message.lower().strip()

    # Internal welcome trigger (frontend sends "__welcome__" on first open).
    # Returns the spoken welcome instantly without calling the LLM.
    if text == "__welcome__":
        welcome = {
            "reply_en":  "Namaste. I am Arya, your IT assistant. How may I help you today?",
            "reply_hi":  "नमस्ते। मैं आर्या हूँ, आपका IT सहायक। मैं आपकी कैसे सहायता कर सकता हूँ?",
            "reply_hinglish": "Namaste. Main Arya hoon, aapka IT assistant. Main aapki kaise madad kar sakta hoon?"
        }
        return _pick(welcome, lang)

    # Greetings: strict — only if the whole message is basically a greeting.
    if _is_pure_greeting(text):
        greet = {
            "reply_en":  "Hello! I'm Arya. How can I help you today?",
            "reply_hi":  "नमस्ते! मैं आर्या हूँ। मैं आपकी कैसे सहायता कर सकता हूँ?",
            "reply_hinglish": "Hello! Main Aryya hoon. Main aapki kaise madad kar sakta hoon?"
        }
        return _pick(greet, lang)
        

    # Topic rules: whole-word / phrase match only.
    for rule in RULES:
        for kw in rule["keywords"]:
            if _has_phrase(text, kw):
                return _pick(rule, lang)

    # No confident match → let the LLM answer.
    return None