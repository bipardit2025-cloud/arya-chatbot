from faster_whisper import WhisperModel

# Load once at startup. "small" is a good speed/accuracy balance on CPU.
model = WhisperModel(
    "small",
    device="cpu",
    compute_type="int8"
)


def speech_to_text(audio_path):
    """
    Transcribe an audio file.

    IMPORTANT: language is NOT hardcoded anymore. Whisper auto-detects
    Hindi vs English (and romanized speech) so English questions are no
    longer mangled into Hindi. We bias toward hi/en which covers the
    English / Hindi / Hinglish use case for a government IT helpdesk.
    """
    try:
        segments, info = model.transcribe(
            audio_path,
            language=None,          # auto-detect
            beam_size=5,
            vad_filter=True,        # skip silence -> faster + cleaner
        )

        text = ""
        for segment in segments:
            text += segment.text + " "

        detected = getattr(info, "language", "unknown")
        print(f"[STT] detected language: {detected}")

        return text.strip()

    except Exception as e:
        print("[STT] error:", str(e))
        return ""
