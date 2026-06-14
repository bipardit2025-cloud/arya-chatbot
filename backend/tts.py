import subprocess
import re
import os
import uuid

PIPER_EXE = r"C:\piper\piper.exe"

EN_VOICE = r"C:\piper\voices\en_US-bryce-medium.onnx"
HI_VOICE = r"C:\piper\voices\hi_IN-pratham-medium.onnx"

# Where generated audio is written. Each reply gets a UNIQUE file so
# concurrent users (a govt portal will have many) never get crossed audio.
AUDIO_DIR = os.path.join(os.path.dirname(__file__), "audio_out")
os.makedirs(AUDIO_DIR, exist_ok=True)


def clean_for_tts(text):
    """Strip code blocks, emojis and markdown so Piper speaks naturally."""
    # Remove code blocks completely
    text = re.sub(r"```[\s\S]*?```", "", text)

    # Remove emojis
    text = re.sub(r"[\U00010000-\U0010FFFF]", "", text)

    # Remove markdown symbols
    text = text.replace("*", "").replace("#", "").replace("`", "")

    # Remove words that sound weird when spoken
    for w in ("bash", "cmd", "powershell"):
        text = text.replace(w, "")

    # Remove repetitive filler phrases
    for phrase in ("Use:", "You can use:", "These commands display", "The command"):
        text = text.replace(phrase, "")

    # Collapse whitespace
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def _select_voice(language):
    """
    Pick a Piper voice.

    - en       -> English voice
    - hi       -> Hindi voice (Devanagari)
    - hinglish -> Hindi voice handles romanized Hindi words far more
                  naturally than the English voice, so we use HI_VOICE.
    """
    if language in ("hi", "hinglish"):
        return HI_VOICE
    return EN_VOICE


def text_to_speech(text, language="en"):
    """
    Generate speech and return a UNIQUE filename (not a fixed path).
    main.py serves it back via /audio/{filename}.
    """
    text = clean_for_tts(text)
    if not text:
        return None

    filename = f"{uuid.uuid4().hex}.wav"
    output_path = os.path.join(AUDIO_DIR, filename)

    voice = _select_voice(language)

    print("\n========== TTS DEBUG ==========")
    print("Language :", language)
    print("Voice    :", voice)
    print("Text     :", text[:200])
    print("Output   :", output_path)
    print("================================")

    try:
        result = subprocess.run(
            [PIPER_EXE, "-m", voice, "-f", output_path],
            input=text.encode("utf-8"),
            capture_output=True,
        )

        print("Piper Return Code :", result.returncode)
        if result.stderr:
            print("Piper Error :", result.stderr.decode("utf-8", errors="ignore"))

        if os.path.exists(output_path):
            size = os.path.getsize(output_path)
            print(f"Generated Audio: {output_path} ({size} bytes)")
        else:
            print("ERROR: audio file was not created!")
            return None

    except Exception as e:
        print("TTS Exception:", str(e))
        return None

    return filename
