"""
router.py
=========
Hybrid response engine for Arya.

Flow per message:
  1. detect_language(message)            -> en | hi | hinglish
  2. match_rule(message)                 -> fast canned reply (greetings etc.)
     - if matched: skip the LLM (instant, deterministic)
  3. otherwise call the local Ollama model WITH conversation history
  4. generate speech in the correct language (en / hi / hinglish)

Key fixes vs the old version:
  - Actually uses hardcoded_rules.py (was dead code before).
  - Hinglish is a real third language (was collapsed into Hindi).
  - Conversation history is honored (multi-turn memory).
  - Ollama call is wrapped with error handling + a system persona.
  - Returns a per-request audio filename (no shared-file race).
"""

import time
import ollama

from tts import text_to_speech
from persona import _PROMPT
from hardcoded_rules import detect_language, match_rule
from form_flow import start_or_continue

MODEL_NAME = "arya"


def _build_messages(user_message, history, language):
    """Assemble the message list for Ollama: system + history + new turn."""
    lang_hint = {
        "en": "Reply in English.",
        "hi": "Reply in Hindi (Devanagari script).",
        "hinglish": "Reply in Hinglish (romanized Hindi mixed with English, the way Indian IT staff actually talk).",
    }.get(language, "Reply in English.")

    messages = [{"role": "system", "content": _PROMPT + "\n\n" + lang_hint}]

    # Carry prior turns (already trimmed by the frontend, but guard anyway).
    if history:
        for turn in history[-10:]:
            role = turn.get("role")
            content = turn.get("content", "")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": user_message})
    return messages


def _post_process(reply, user_message):
    """Trim filler and keep command-style answers short."""
    reply = reply.strip()
    reply = reply.replace("Use:\n\n", "").replace("Use:\n", "")

    if user_message.lower().startswith(
        ("how", "kaise", "kya command", "command", "linux mein", "linux me")
    ):
        lines = reply.split("\n")
        if len(lines) > 8:
            reply = "\n".join(lines[:8])

    return reply


def get_response(user_message, history=None, session_id="default"):
    """
    Main entry point used by main.py.

    Returns:
        {
          "reply": str,
          "language": "en" | "hi" | "hinglish",
          "audio": filename (str),
          "source": "rule" | "form" | "llm",
          "response_time": float,
          ...form flags when relevant...
        }
    """
    start = time.time()
    history = history or []

    language = detect_language(user_message)

    # ---- Step 0: active/triggered ERP form flow (highest priority) ----
    # If a form is in progress for this session, or the user is asking to
    # fill a form, the form engine handles the turn deterministically.
    form_result = start_or_continue(session_id, user_message, language)
    if form_result is not None:
        audio_file = text_to_speech(form_result["reply"], form_result.get("language", language))
        form_result["audio"] = audio_file
        form_result["response_time"] = round(time.time() - start, 2)
        return form_result

    # ---- Step 1: fast deterministic rules (greetings, identity, thanks) ----
    canned = match_rule(user_message)
    if canned is not None:
        audio_file = text_to_speech(canned, language)
        return {
            "reply": canned,
            "language": language,
            "audio": audio_file,
            "source": "rule",
            "response_time": round(time.time() - start, 2),
        }

    # ---- Step 2: LLM with memory ----
    try:
        response = ollama.chat(
            model=MODEL_NAME,
            messages=_build_messages(user_message, history, language),
        )
        reply = _post_process(response["message"]["content"], user_message)
    except Exception as e:
        print("[LLM] error:", str(e))
        reply = {
            "en": "Sorry, the AI engine is not responding right now. Please try again in a moment.",
            "hi": "क्षमा करें, AI इंजन अभी उत्तर नहीं दे रहा है। कृपया थोड़ी देर बाद पुनः प्रयास करें।",
            "hinglish": "Sorry, AI engine abhi respond nahi kar raha. Thodi der baad dobara try kijiye.",
        }.get(language, "Sorry, the AI engine is not responding right now. Please try again.")

    # ---- Step 3: speech ----
    audio_file = text_to_speech(reply, language)

    return {
        "reply": reply,
        "language": language,
        "audio": audio_file,
        "source": "llm",
        "response_time": round(time.time() - start, 2),
    }
