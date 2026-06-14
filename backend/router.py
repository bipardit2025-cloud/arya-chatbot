# import ollama
# import time
# from tts import text_to_speech

# def get_response(user_message):

#     start = time.time()

#     response = ollama.chat(
#         model="arya",
#         messages=[
#             {
#                 "role": "user",
#                 "content": user_message
#             }
#         ]
#     )

#     reply = response["message"]["content"].strip()

#     # Detect language
#     language = "en"

#     if any("\u0900" <= ch <= "\u097F" for ch in reply):
#         language = "hi"

#     # Generate speech
#     audio_file = text_to_speech(
#         reply,
#         language
#     )

#     end = time.time()

#     return {
#         "reply": reply,
#         "audio": audio_file,
#         "response_time": round(end - start, 2)
#     }

import ollama
import time
from tts import text_to_speech

def get_response(user_message):

    start = time.time()

    response = ollama.chat(
        model="arya",
        messages=[
            {
                "role": "user",
                "content": user_message
            }
        ]
    )

    reply = response["message"]["content"].strip()

    # Remove common unnecessary prefixes
    reply = reply.replace("Use:\n\n", "")
    reply = reply.replace("Use:\n", "")

    # Remove common explanations for very short command answers
    if user_message.lower().startswith(
        ("how", "kaise", "kya command", "command", "linux mein", "linux me")
    ):
        lines = reply.split("\n")

        # Keep only first few meaningful lines
        if len(lines) > 5:
            reply = "\n".join(lines[:5])

    # -------------------------
    # Language Detection
    # -------------------------

    user_text = user_message.lower()

    language = "en"

    # Hindi Script
    if any("\u0900" <= ch <= "\u097F" for ch in user_message):
        language = "hi"

    # Hinglish Detection
    elif any(word in user_text for word in [
        "hai",
        "haan",
        "nahi",
        "kaise",
        "kya",
        "mera",
        "meri",
        "aap",
        "tum",
        "main",
        "hoon",
        "kar",
        "karna",
        "kyunki",
        "agar",
        "samajh",
        "batata",
        "batayiye",
        "namaste",
        "bhai",
        "sir",
        "madad"
    ]):
        language = "hi"

    # -------------------------
    # Generate Speech
    # -------------------------



    audio_file = text_to_speech(
        reply,
        language
    )

    end = time.time()

    return {
        "reply": reply,
        "audio": audio_file,
        "response_time": round(end - start, 2)
    }