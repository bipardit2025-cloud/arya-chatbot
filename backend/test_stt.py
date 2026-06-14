# from faster_whisper import WhisperModel

# model = WhisperModel(
#     "small",
#     device="cpu",
#     compute_type="int8"
# )

# segments, info = model.transcribe(
#     "audio/Hinglish.mp3",
#     language="hi",
#     beam_size=5
# )

# print("\nDetected Language:", info.language)

# print("\nTranscript:\n")

# for segment in segments:
#     print(segment.text)

from stt import speech_to_text

result = speech_to_text("audio/Hinglish.mp3")

print(result)