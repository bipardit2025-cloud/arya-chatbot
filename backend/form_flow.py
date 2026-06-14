"""
form_flow.py
============
Conversational form-filling engine for Arya.

Drives the exact flow the user described:

  User : "humko erp pe form bharna hai staff ka"
  Arya : "Hmm, aapko staff ka form bharna hai. Rukiye, main jaankari
          ikattha karta hoon ki kya-kya details maangi jaayengi..."
  (engine looks up the staff form structure)
  Arya : "Mujhe staff form ka structure mil gaya. Iske anusaar mujhe
          aapse ye details chahiye: ... Shuru karein? OK boliye ya likhiye."
  Arya : asks fields one by one -> "Pehla, aapka naam kya hai?"
  ...collects every field, validating each...
  Arya : shows all details -> "Submit karne se pehle ek baar verify kijiye."
  User : "verify" / "ok" / "haan"
  Arya : "Aapki form submit ki jaa rahi hai..."
          "Dhanyawad, aapki staff form submit ho chuki hai. Kya main
          aapki koi aur madad kar sakta hoon?"

State lives PER SESSION (keyed by session_id passed from frontend) so the
ERP portal can run this for many users at once.

Public API:
    start_or_continue(session_id, message, language) -> dict | None
        Returns a response dict if the form flow is handling this turn,
        or None to let the normal LLM/rule path answer.

Response dict shape (same keys main.py/router already use):
    {"reply": str, "language": lang, "form_active": bool,
     "awaiting_verify": bool, "submitted": bool, "collected": {...}}
"""

import re
import time

from forms import FORMS, find_form_by_text, field_label, get_form_name

# In-memory session store. {session_id: {...state...}}
# For production with multiple workers, back this with Redis; the logic is
# identical — only the storage changes.
_SESSIONS = {}

# Words that mean "start / yes / go ahead" in en/hi/hinglish
_YES = {
    "ok", "okay", "yes", "yeah", "sure", "start", "begin", "go", "haan", "han",
    "haa", "theek", "thik", "thik hai", "theek hai", "chalo", "karo", "karein",
    "shuru", "\u0939\u093e\u0901", "\u0920\u0940\u0915", "\u0936\u0941\u0930\u0942", "\u091a\u0932\u094b",
}
_NO = {
    "no", "nahi", "nahin", "cancel", "stop", "ruko", "rehne do", "\u0928\u0939\u0940\u0902",
    "\u0930\u0939\u0928\u0947 \u0926\u094b", "\u0930\u0941\u0915\u094b",
}
_VERIFY = {
    "verify", "verified", "confirm", "confirmed", "submit", "ok", "okay",
    "haan", "han", "theek", "thik", "sahi", "correct", "\u0939\u093e\u0901", "\u0938\u0939\u0940",
}
_EDIT = {"edit", "change", "galat", "wrong", "badlo", "badal", "\u0917\u0932\u0924", "\u092c\u0926\u0932\u094b"}


# ---------------------------------------------------------------------------
# Localized phrasing helpers
# ---------------------------------------------------------------------------

def _t(lang, en, hi, hinglish):
    return {"en": en, "hi": hi, "hinglish": hinglish}.get(lang, en)


def _wants_form(message):
    """Heuristic: does the user want to fill a form?"""
    t = message.lower()
    triggers = [
        "form", "bharna", "bharni", "fill", "apply", "aavedan", "\u092b\u0949\u0930\u094d\u092e",
        "\u092d\u0930\u0928\u093e", "\u0906\u0935\u0947\u0926\u0928",
    ]
    return any(x in t for x in triggers)


def _is_yes(message):
    t = re.sub(r"[^a-zA-Z\u0900-\u097F ]", "", message.lower()).strip()
    return t in _YES or any(w in _YES for w in t.split())


def _is_no(message):
    t = re.sub(r"[^a-zA-Z\u0900-\u097F ]", "", message.lower()).strip()
    return t in _NO or any(w in _NO for w in t.split())


def _is_verify(message):
    t = re.sub(r"[^a-zA-Z\u0900-\u097F ]", "", message.lower()).strip()
    return t in _VERIFY or any(w in _VERIFY for w in t.split())


def _is_edit(message):
    t = message.lower()
    return any(w in t for w in _EDIT)


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def _validate(field, value):
    """Return (ok, cleaned_value_or_error_key)."""
    v = value.strip()
    if not v:
        return False, "empty"

    ftype = field.get("type", "text")

    if ftype == "phone":
        digits = re.sub(r"\D", "", v)
        if len(digits) < 10:
            return False, "phone"
        return True, digits

    if ftype == "email":
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            return False, "email"
        return True, v

    if ftype == "number":
        if not re.search(r"\d", v):
            return False, "number"
        return True, v

    if ftype == "choice":
        opts = field.get("options", [])
        for o in opts:
            if o.lower() in v.lower():
                return True, o
        return False, "choice"

    return True, v


def _validation_error(field, err, lang):
    label = field_label(field, lang)
    if err == "phone":
        return _t(lang,
                  "That doesn't look like a valid mobile number. Please enter a 10-digit number.",
                  "\u092f\u0939 \u0938\u0939\u0940 \u092e\u094b\u092c\u093e\u0907\u0932 \u0928\u0902\u092c\u0930 \u0928\u0939\u0940\u0902 \u0932\u0917 \u0930\u0939\u093e\u0964 \u0915\u0943\u092a\u092f\u093e 10 \u0905\u0902\u0915\u094b\u0902 \u0915\u093e \u0928\u0902\u092c\u0930 \u0926\u0947\u0902\u0964",
                  "Yeh sahi mobile number nahi lag raha. Kripya 10 digit ka number dijiye.")
    if err == "email":
        return _t(lang,
                  "That email looks invalid. Please enter a valid email.",
                  "\u092f\u0939 \u0908\u092e\u0947\u0932 \u0938\u0939\u0940 \u0928\u0939\u0940\u0902 \u0932\u0917 \u0930\u0939\u093e\u0964 \u0915\u0943\u092a\u092f\u093e \u0938\u0939\u0940 \u0908\u092e\u0947\u0932 \u0926\u0947\u0902\u0964",
                  "Yeh email sahi nahi lag raha. Kripya valid email dijiye.")
    if err == "choice":
        opts = " / ".join(field.get("options", []))
        return _t(lang,
                  f"Please choose one of: {opts}.",
                  f"\u0915\u0943\u092a\u092f\u093e \u0907\u0928\u092e\u0947\u0902 \u0938\u0947 \u090f\u0915 \u091a\u0941\u0928\u0947\u0902: {opts}\u0964",
                  f"Kripya inme se ek chuniye: {opts}.")
    return _t(lang,
              f"Please provide: {label}",
              f"\u0915\u0943\u092a\u092f\u093e \u092f\u0939 \u091c\u093e\u0928\u0915\u093e\u0930\u0940 \u0926\u0947\u0902: {label}",
              f"Kripya yeh jaankari dijiye: {label}")


# ---------------------------------------------------------------------------
# Flow steps
# ---------------------------------------------------------------------------

def _resp(reply, lang, state, **extra):
    out = {
        "reply": reply,
        "language": lang,
        "form_active": True,
        "awaiting_verify": state.get("stage") == "verify" if state else False,
        "submitted": False,
        "source": "form",
    }
    out.update(extra)
    return out


def _field_list_text(form, lang):
    names = [field_label(f, lang).rstrip("?") for f in form["fields"]]
    return "\n".join(f"\u2022 {n}" for n in names)


def _ask_current_field(state, lang, prefix=""):
    form = FORMS[state["form_key"]]
    field = form["fields"][state["index"]]
    q = field_label(field, lang)
    ordinal = state["index"] + 1
    lead = _t(lang, f"Question {ordinal}: ", f"\u092a\u094d\u0930\u0936\u094d\u0928 {ordinal}: ", f"Question {ordinal}: ")
    return prefix + lead + q


def _summary(state, lang):
    form = FORMS[state["form_key"]]
    lines = []
    for f in form["fields"]:
        label = field_label(f, lang).rstrip("?")
        val = state["data"].get(f["key"], "-")
        lines.append(f"\u2022 {label}: {val}")
    body = "\n".join(lines)
    header = _t(lang,
                "Here are your details. Please verify once before I submit:",
                "\u092f\u0947 \u0930\u0939\u0940 \u0906\u092a\u0915\u0940 \u091c\u093e\u0928\u0915\u093e\u0930\u0940\u0964 \u0938\u092c\u092e\u093f\u091f \u0915\u0930\u0928\u0947 \u0938\u0947 \u092a\u0939\u0932\u0947 \u090f\u0915 \u092c\u093e\u0930 \u0935\u0947\u0930\u093f\u092b\u093e\u0908 \u0915\u0940\u091c\u093f\u090f:",
                "Yeh rahi aapki details. Submit karne se pehle ek baar verify kijiye:")
    footer = _t(lang,
                "\nType or say 'verify' to submit, or 'edit' to change something.",
                "\n\u0938\u092c\u092e\u093f\u091f \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f 'verify' \u0932\u093f\u0916\u0947\u0902/\u092c\u094b\u0932\u0947\u0902, \u092f\u093e \u092c\u0926\u0932\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f 'edit'\u0964",
                "\nSubmit karne ke liye 'verify' likhiye/boliye, ya badalne ke liye 'edit'.")
    return f"{header}\n\n{body}\n{footer}"


def start_or_continue(session_id, message, language):
    """Main entry. Returns dict if handling this turn, else None."""
    lang = language
    state = _SESSIONS.get(session_id)

    # ---------------- No active form: decide whether to start one ----------
    if not state or state.get("stage") == "done":
        if not _wants_form(message):
            return None  # let normal chat handle it

        form_key = find_form_by_text(message)

        if not form_key:
            # User wants a form but didn't name a known one.
            available = ", ".join(get_form_name(k, lang) for k in FORMS.keys())
            reply = _t(lang,
                       f"Sure, I can help you fill a form. Which form? Available: {available}.",
                       f"\u091c\u0940 \u0939\u093e\u0901, \u092e\u0948\u0902 \u092b\u0949\u0930\u094d\u092e \u092d\u0930\u0928\u0947 \u092e\u0947\u0902 \u0906\u092a\u0915\u0940 \u092e\u0926\u0926 \u0915\u0930 \u0938\u0915\u0924\u093e \u0939\u0942\u0901\u0964 \u0915\u094c\u0928 \u0938\u093e \u092b\u0949\u0930\u094d\u092e? \u0909\u092a\u0932\u092c\u094d\u0927: {available}\u0964",
                       f"Ji haan, main form bharne me aapki madad kar sakta hoon. Kaun sa form? Available: {available}.")
            # park a light state so the next message naming a form continues
            _SESSIONS[session_id] = {"stage": "awaiting_form_name", "ts": time.time()}
            return _resp(reply, lang, _SESSIONS[session_id])

        return _begin_form(session_id, form_key, lang)

    # ------------- Parked, waiting for the user to name the form ----------
    if state.get("stage") == "awaiting_form_name":
        form_key = find_form_by_text(message)
        if _is_no(message):
            _SESSIONS.pop(session_id, None)
            return _resp(_t(lang, "No problem. Tell me whenever you need a form.",
                            "\u0915\u094b\u0908 \u092c\u093e\u0924 \u0928\u0939\u0940\u0902\u0964 \u091c\u092c \u092d\u0940 \u092b\u0949\u0930\u094d\u092e \u091a\u093e\u0939\u093f\u090f \u092c\u0924\u093e\u0907\u090f\u0917\u093e\u0964",
                            "Koi baat nahi. Jab bhi form chahiye bataiyega."),
                         lang, None, form_active=False)
        if form_key:
            return _begin_form(session_id, form_key, lang)
        return None  # not a form name -> let normal chat answer

    # ----------------- Confirm stage: waiting for OK to start -------------
    if state.get("stage") == "confirm":
        if _is_no(message):
            _SESSIONS.pop(session_id, None)
            return _resp(_t(lang, "Okay, cancelled. Let me know if you need anything else.",
                            "\u0920\u0940\u0915 \u0939\u0948, \u0930\u0926\u094d\u0926 \u0915\u0930 \u0926\u093f\u092f\u093e\u0964 \u0915\u094b\u0908 \u0914\u0930 \u0938\u0939\u093e\u092f\u0924\u093e \u091a\u093e\u0939\u093f\u090f \u0924\u094b \u092c\u0924\u093e\u0907\u090f\u0964",
                            "Theek hai, cancel kar diya. Koi aur madad chahiye to bataiye."),
                         lang, None, form_active=False)
        # Anything affirmative (or any answer) -> begin asking fields
        state["stage"] = "collect"
        state["index"] = 0
        return _resp(_ask_current_field(state, lang), lang, state)

    # --------------------------- Collecting fields -----------------------
    if state.get("stage") == "collect":
        form = FORMS[state["form_key"]]
        field = form["fields"][state["index"]]

        # Allow skipping optional fields
        if not field.get("required", True) and _is_no(message):
            state["data"][field["key"]] = "-"
        else:
            ok, result = _validate(field, message)
            if not ok:
                return _resp(_validation_error(field, result, lang), lang, state)
            state["data"][field["key"]] = result

        state["index"] += 1
        if state["index"] >= len(form["fields"]):
            state["stage"] = "verify"
            return _resp(_summary(state, lang), lang, state)
        return _resp(_ask_current_field(state, lang), lang, state)

    # ----------------------------- Verify stage --------------------------
    if state.get("stage") == "verify":
        if _is_edit(message):
            state["stage"] = "collect"
            state["index"] = 0
            return _resp(_t(lang, "Okay, let's go through it again.",
                            "\u0920\u0940\u0915 \u0939\u0948, \u092b\u093f\u0930 \u0938\u0947 \u092d\u0930\u0924\u0947 \u0939\u0948\u0902\u0964",
                            "Theek hai, dobara bharte hain.") + "\n\n" + _ask_current_field(state, lang),
                         lang, state)
        if _is_no(message):
            _SESSIONS.pop(session_id, None)
            return _resp(_t(lang, "Cancelled. Nothing was submitted.",
                            "\u0930\u0926\u094d\u0926 \u0915\u0930 \u0926\u093f\u092f\u093e\u0964 \u0915\u0941\u091b \u092d\u0940 \u0938\u092c\u092e\u093f\u091f \u0928\u0939\u0940\u0902 \u0939\u0941\u0906\u0964",
                            "Cancel kar diya. Kuch bhi submit nahi hua."),
                         lang, None, form_active=False)
        if _is_verify(message):
            return _submit(session_id, state, lang)
        # Unclear -> reprompt
        return _resp(_t(lang, "Please type 'verify' to submit, 'edit' to change, or 'cancel'.",
                        "\u0915\u0943\u092a\u092f\u093e \u0938\u092c\u092e\u093f\u091f \u0915\u0947 \u0932\u093f\u090f 'verify', \u092c\u0926\u0932\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f 'edit', \u092f\u093e 'cancel' \u0932\u093f\u0916\u0947\u0902\u0964",
                        "Kripya submit ke liye 'verify', badalne ke liye 'edit', ya 'cancel' likhiye."),
                     lang, state)

    return None


def _begin_form(session_id, form_key, lang):
    """Acknowledge instantly, present the structure, ask to start."""
    form = FORMS[form_key]
    name = get_form_name(form_key, lang)

    _SESSIONS[session_id] = {
        "stage": "confirm",
        "form_key": form_key,
        "index": 0,
        "data": {},
        "ts": time.time(),
    }

    ack = _t(lang,
             f"Hmm, you want to fill the {name}. Let me gather what details are required... one moment.",
             f"Hmm, \u0906\u092a {name} \u092d\u0930\u0928\u093e \u091a\u093e\u0939\u0924\u0947 \u0939\u0948\u0902\u0964 \u0930\u0941\u0915\u093f\u090f, \u092e\u0948\u0902 \u091c\u093e\u0928\u0915\u093e\u0930\u0940 \u0907\u0915\u091f\u094d\u0920\u093e \u0915\u0930\u0924\u093e \u0939\u0942\u0901 \u0915\u093f \u0915\u094d\u092f\u093e-\u0915\u094d\u092f\u093e \u0926\u093f\u090f\u091a\u0947\u0932 \u091a\u093e\u0939\u093f\u090f... \u090f\u0915 \u092a\u0932\u0964",
             f"Hmm, aapko {name} bharna hai. Rukiye, main jaankari ikattha karta hoon ki kya-kya details maangi jaayengi... ek pal.")

    fields_txt = _field_list_text(form, lang)
    got = _t(lang,
             f"I found the {name} structure. As per it, I will need these details:\n\n{fields_txt}\n\nShall we start? Type or say 'OK'.",
             f"\u092e\u0941\u091d\u0947 {name} \u0915\u093e \u0938\u094d\u091f\u094d\u0930\u0915\u094d\u091a\u0930 \u092e\u093f\u0932 \u0917\u092f\u093e\u0964 \u0907\u0938\u0915\u0947 \u0905\u0928\u0941\u0938\u093e\u0930 \u092e\u0941\u091d\u0947 \u0906\u092a\u0938\u0947 \u092f\u0947 \u0926\u093f\u090f\u091a\u0947\u0932 \u091a\u093e\u0939\u093f\u090f:\n\n{fields_txt}\n\n\u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902? 'OK' \u0932\u093f\u0916\u0947\u0902 \u092f\u093e \u092c\u094b\u0932\u0947\u0902\u0964",
             f"Mujhe {name} ka structure mil gaya. Iske anusaar mujhe aapse ye details chahiye:\n\n{fields_txt}\n\nShuru karein? 'OK' likhiye ya boliye.")

    reply = ack + "\n\n" + got
    return _resp(reply, lang, _SESSIONS[session_id])


def _submit(session_id, state, lang):
    """Finalize: here is where you POST to the real ERP API in production."""
    form_key = state["form_key"]
    name = get_form_name(form_key, lang)
    data = dict(state["data"])

    # TODO (production): send `data` to the real ERP endpoint, e.g.
    #   requests.post(ERP_SUBMIT_URL + form_key, json=data, headers=...)
    # For now we just log it.
    print(f"[FORM SUBMIT] {form_key} -> {data}")

    state["stage"] = "done"
    _SESSIONS.pop(session_id, None)

    submitting = _t(lang,
                    "Submitting your form...",
                    "\u0906\u092a\u0915\u0940 \u092b\u0949\u0930\u094d\u092e \u0938\u092c\u092e\u093f\u091f \u0915\u0940 \u091c\u093e \u0930\u0939\u0940 \u0939\u0948...",
                    "Aapki form submit ki jaa rahi hai...")
    done = _t(lang,
              f"Thank you. Your {name} has been submitted successfully. Can I help you with anything else?",
              f"\u0927\u0928\u094d\u092f\u0935\u093e\u0926\u0964 \u0906\u092a\u0915\u0940 {name} \u0938\u092b\u0932\u0924\u093e\u092a\u0942\u0930\u094d\u0935\u0915 \u0938\u092c\u092e\u093f\u091f \u0939\u094b \u091a\u0941\u0915\u0940 \u0939\u0948\u0964 \u0915\u094d\u092f\u093e \u092e\u0948\u0902 \u0906\u092a\u0915\u0940 \u0915\u094b\u0908 \u0914\u0930 \u092e\u0926\u0926 \u0915\u0930 \u0938\u0915\u0924\u093e \u0939\u0942\u0901?",
              f"Dhanyawad. Aapki {name} submit ho chuki hai. Kya main aapki koi aur madad kar sakta hoon?")

    return {
        "reply": submitting + "\n\n" + done,
        "language": lang,
        "form_active": False,
        "awaiting_verify": False,
        "submitted": True,
        "collected": data,
        "source": "form",
    }
