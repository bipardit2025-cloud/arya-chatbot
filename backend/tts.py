import subprocess
import re
import os

PIPER_EXE = r"C:\piper\piper.exe"

EN_VOICE = r"C:\piper\voices\en_US-bryce-medium.onnx"
HI_VOICE = r"C:\piper\voices\hi_IN-pratham-medium.onnx"


### Replace your current `clean_for_tts()` with:

def clean_for_tts(text):

    # Remove code blocks completely
    text = re.sub(
        r"```[\s\S]*?```",
        "",
        text
    )

    # Remove emojis
    text = re.sub(
        r'[\U00010000-\U0010FFFF]',
        '',
        text
    )

    # Remove markdown
    text = text.replace("*", "")
    text = text.replace("#", "")
    text = text.replace("`", "")

    # Remove common words that sound weird in speech
    text = text.replace("bash", "")
    text = text.replace("cmd", "")
    text = text.replace("powershell", "")

    # Remove repetitive phrases
    text = text.replace("Use:", "")
    text = text.replace("You can use:", "")
    text = text.replace("These commands display", "")
    text = text.replace("The command", "")

    # Clean spaces
    text = re.sub(r"\s+", " ", text)

    return text.strip()
    """
    Clean text before sending to Piper.
    """

    # Remove emojis
    text = re.sub(
        r'[\U00010000-\U0010FFFF]',
        '',
        text
    )

    # Remove common symbols
    text = text.replace("🤖", "")
    text = text.replace("😊", "")
    text = text.replace("👋", "")
    text = text.replace("🔥", "")
    text = text.replace("✨", "")
    text = text.replace("💡", "")
    text = text.replace("🚀", "")
    text = text.replace("🎉", "")
    text = text.replace("👍", "")

    # Remove markdown symbols
    text = text.replace("*", "")
    text = text.replace("#", "")
    text = text.replace("`", "")

    # Remove excessive whitespace
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def text_to_speech(text, language="en"):

    # Clean text
    text = clean_for_tts(text)

    output_file = "response.wav"

    # Select voice
    voice = EN_VOICE

    if language == "hi":
        voice = HI_VOICE

    print("\n========== TTS DEBUG ==========")
    print("Language :", language)
    print("Voice    :", voice)
    print("Text     :", text[:200])
    print("================================")

    try:

        result = subprocess.run(
            [
                PIPER_EXE,
                "-m",
                voice,
                "-f",
                output_file
            ],
            input=text.encode("utf-8"),
            capture_output=True
        )

        print("Piper Return Code :", result.returncode)

        if result.stdout:
            print(
                "Piper Output :",
                result.stdout.decode(
                    "utf-8",
                    errors="ignore"
                )
            )

        if result.stderr:
            print(
                "Piper Error :",
                result.stderr.decode(
                    "utf-8",
                    errors="ignore"
                )
            )

        # Verify file exists
        if os.path.exists(output_file):

            size = os.path.getsize(output_file)

            print(
                f"Generated Audio: {output_file} ({size} bytes)"
            )

        else:

            print(
                "ERROR: response.wav was not created!"
            )

    except Exception as e:

        print(
            "TTS Exception:",
            str(e)
        )

    return output_file