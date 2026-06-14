"""
forms.py
========
ERP FORM STRUCTURES — edit this file to change which forms Arya can fill.

This is the SINGLE place you maintain. When the ERP portal adds/changes a
form field, just edit the relevant entry here. Arya reads this structure,
asks the user for each field (in chat or by voice), validates, then submits.

How to add / change a form:
  - Add a key under FORMS (e.g. "leave", "asset_request").
  - Give it: name, aliases (words the user might say), and fields.
  - Each field has:
        key       : machine name (stored value key)
        label_en  : question shown/asked in English
        label_hi  : question in Hindi
        label_hinglish : question in Hinglish
        type      : text | number | email | phone | date | choice
        required  : True/False
        options   : list (only for type "choice")

Nothing else in the codebase needs editing to add a new form.
"""

FORMS = {
    # ----------------------------------------------------------------
    # STAFF / EMPLOYEE FORM
    # ----------------------------------------------------------------
    "staff": {
        "name_en": "Staff Registration Form",
        "name_hi": "\u0938\u094d\u091f\u093e\u092b \u092a\u0902\u091c\u0940\u0915\u0930\u0923 \u092b\u0949\u0930\u094d\u092e",
        "name_hinglish": "Staff Registration Form",
        # words/phrases that mean "the staff form"
        "aliases": [
            "staff", "staff form", "employee", "employee form", "karmchari",
            "\u0915\u0930\u094d\u092e\u091a\u093e\u0930\u0940", "staff ka form", "staff registration",
        ],
        "fields": [
            {"key": "full_name", "type": "text", "required": True,
             "label_en": "What is your full name?",
             "label_hi": "\u0906\u092a\u0915\u093e \u092a\u0942\u0930\u093e \u0928\u093e\u092e \u0915\u094d\u092f\u093e \u0939\u0948?",
             "label_hinglish": "Aapka pura naam kya hai?"},

            {"key": "father_name", "type": "text", "required": True,
             "label_en": "What is your father's name?",
             "label_hi": "\u0906\u092a\u0915\u0947 \u092a\u093f\u0924\u093e \u0915\u093e \u0928\u093e\u092e \u0915\u094d\u092f\u093e \u0939\u0948?",
             "label_hinglish": "Aapke pita ka naam kya hai?"},

            {"key": "designation", "type": "text", "required": True,
             "label_en": "What is your designation / post?",
             "label_hi": "\u0906\u092a\u0915\u093e \u092a\u0926 \u0915\u094d\u092f\u093e \u0939\u0948?",
             "label_hinglish": "Aapka designation / post kya hai?"},

            {"key": "department", "type": "text", "required": True,
             "label_en": "Which department do you belong to?",
             "label_hi": "\u0906\u092a \u0915\u093f\u0938 \u0935\u093f\u092d\u093e\u0917 \u0938\u0947 \u0939\u0948\u0902?",
             "label_hinglish": "Aap kis department se hain?"},

            {"key": "employee_id", "type": "text", "required": True,
             "label_en": "What is your employee ID?",
             "label_hi": "\u0906\u092a\u0915\u0940 \u0915\u0930\u094d\u092e\u091a\u093e\u0930\u0940 \u0906\u0908\u0921\u0940 \u0915\u094d\u092f\u093e \u0939\u0948?",
             "label_hinglish": "Aapki employee ID kya hai?"},

            {"key": "phone", "type": "phone", "required": True,
             "label_en": "What is your mobile number?",
             "label_hi": "\u0906\u092a\u0915\u093e \u092e\u094b\u092c\u093e\u0907\u0932 \u0928\u0902\u092c\u0930 \u0915\u094d\u092f\u093e \u0939\u0948?",
             "label_hinglish": "Aapka mobile number kya hai?"},

            {"key": "email", "type": "email", "required": False,
             "label_en": "What is your email address? (optional)",
             "label_hi": "\u0906\u092a\u0915\u093e \u0908\u092e\u0947\u0932 \u092a\u0924\u093e \u0915\u094d\u092f\u093e \u0939\u0948? (\u0910\u091a\u094d\u091b\u093f\u0915)",
             "label_hinglish": "Aapka email address kya hai? (optional)"},

            {"key": "joining_date", "type": "date", "required": True,
             "label_en": "What is your date of joining? (DD-MM-YYYY)",
             "label_hi": "\u0906\u092a\u0915\u0940 \u091c\u0949\u092f\u0928\u093f\u0902\u0917 \u0924\u093f\u0925\u093f \u0915\u094d\u092f\u093e \u0939\u0948? (DD-MM-YYYY)",
             "label_hinglish": "Aapki joining date kya hai? (DD-MM-YYYY)"},

            {"key": "gender", "type": "choice", "required": True,
             "options": ["Male", "Female", "Other"],
             "label_en": "What is your gender? (Male / Female / Other)",
             "label_hi": "\u0906\u092a\u0915\u093e \u0932\u093f\u0902\u0917 \u0915\u094d\u092f\u093e \u0939\u0948? (\u092a\u0941\u0930\u0941\u0937 / \u092e\u0939\u093f\u0932\u093e / \u0905\u0928\u094d\u092f)",
             "label_hinglish": "Aapka gender kya hai? (Male / Female / Other)"},
        ],
    },

    # ----------------------------------------------------------------
    # LEAVE APPLICATION FORM (example of a second form)
    # ----------------------------------------------------------------
    "leave": {
        "name_en": "Leave Application Form",
        "name_hi": "\u0905\u0935\u0915\u093e\u0936 \u0906\u0935\u0947\u0926\u0928 \u092b\u0949\u0930\u094d\u092e",
        "name_hinglish": "Leave Application Form",
        "aliases": [
            "leave", "leave form", "leave application", "chutti", "avkash",
            "\u091b\u0941\u091f\u094d\u091f\u0940", "\u0905\u0935\u0915\u093e\u0936", "leave ka form",
        ],
        "fields": [
            {"key": "full_name", "type": "text", "required": True,
             "label_en": "What is your full name?",
             "label_hi": "\u0906\u092a\u0915\u093e \u092a\u0942\u0930\u093e \u0928\u093e\u092e \u0915\u094d\u092f\u093e \u0939\u0948?",
             "label_hinglish": "Aapka pura naam kya hai?"},

            {"key": "employee_id", "type": "text", "required": True,
             "label_en": "What is your employee ID?",
             "label_hi": "\u0906\u092a\u0915\u0940 \u0915\u0930\u094d\u092e\u091a\u093e\u0930\u0940 \u0906\u0908\u0921\u0940 \u0915\u094d\u092f\u093e \u0939\u0948?",
             "label_hinglish": "Aapki employee ID kya hai?"},

            {"key": "leave_type", "type": "choice", "required": True,
             "options": ["Casual", "Sick", "Earned", "Other"],
             "label_en": "What type of leave? (Casual / Sick / Earned / Other)",
             "label_hi": "\u0915\u093f\u0938 \u092a\u094d\u0930\u0915\u093e\u0930 \u0915\u093e \u0905\u0935\u0915\u093e\u0936? (Casual / Sick / Earned / Other)",
             "label_hinglish": "Kis type ki leave? (Casual / Sick / Earned / Other)"},

            {"key": "from_date", "type": "date", "required": True,
             "label_en": "Leave from which date? (DD-MM-YYYY)",
             "label_hi": "\u0915\u093f\u0938 \u0924\u093f\u0925\u093f \u0938\u0947 \u0905\u0935\u0915\u093e\u0936? (DD-MM-YYYY)",
             "label_hinglish": "Kis date se leave? (DD-MM-YYYY)"},

            {"key": "to_date", "type": "date", "required": True,
             "label_en": "Leave until which date? (DD-MM-YYYY)",
             "label_hi": "\u0915\u093f\u0938 \u0924\u093f\u0925\u093f \u0924\u0915 \u0905\u0935\u0915\u093e\u0936? (DD-MM-YYYY)",
             "label_hinglish": "Kis date tak leave? (DD-MM-YYYY)"},

            {"key": "reason", "type": "text", "required": True,
             "label_en": "What is the reason for leave?",
             "label_hi": "\u0905\u0935\u0915\u093e\u0936 \u0915\u093e \u0915\u093e\u0930\u0923 \u0915\u094d\u092f\u093e \u0939\u0948?",
             "label_hinglish": "Leave ka reason kya hai?"},
        ],
    },
}


def get_form_name(form_key, lang="en"):
    form = FORMS.get(form_key)
    if not form:
        return form_key
    return form.get(f"name_{lang}", form.get("name_en", form_key))


def find_form_by_text(message):
    """
    Return the form_key whose aliases best match the user's message,
    or None if no form is mentioned.
    """
    text = message.lower()
    best = None
    best_len = 0
    for key, form in FORMS.items():
        for alias in form.get("aliases", []):
            a = alias.lower()
            if a in text and len(a) > best_len:
                best = key
                best_len = len(a)
    return best


def field_label(field, lang="en"):
    return field.get(f"label_{lang}", field.get("label_en", field["key"]))
