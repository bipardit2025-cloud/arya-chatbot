import os

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional

# STT
from stt import speech_to_text

# Chatbot
from router import get_response

# TTS audio directory (per-request files)
from tts import AUDIO_DIR

app = FastAPI(title="Arya IT Assistant")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temp dir for uploaded speech files
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# -----------------------------
# Models
# -----------------------------
class HistoryItem(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[HistoryItem]] = None
    session_id: Optional[str] = "default"


# -----------------------------
# Health check
# -----------------------------
@app.get("/health")
def health():
    return {"status": "ok", "service": "arya"}


# -----------------------------
# Chat Endpoint (with memory)
# -----------------------------
@app.post("/chat")
def chat(req: ChatRequest):
    history = [h.model_dump() for h in req.history] if req.history else []
    result = get_response(req.message, history=history, session_id=req.session_id or "default")
    return result


# -----------------------------
# Speech-to-Text Endpoint
# -----------------------------
@app.post("/speech")
async def speech(file: UploadFile = File(...)):
    temp_file = os.path.join(UPLOAD_DIR, file.filename or "recording.webm")

    try:
        with open(temp_file, "wb") as f:
            f.write(await file.read())

        text = speech_to_text(temp_file)
        return {"text": text}
    except Exception as e:
        return JSONResponse(status_code=500, content={"text": "", "error": str(e)})
    finally:
        if os.path.exists(temp_file):
            try:
                os.remove(temp_file)
            except OSError:
                pass


# -----------------------------
# Audio Endpoint (per-request Piper TTS file)
# -----------------------------
@app.get("/audio/{filename}")
def get_audio(filename: str):
    # Prevent path traversal; only serve plain wav files from AUDIO_DIR.
    safe_name = os.path.basename(filename)
    path = os.path.join(AUDIO_DIR, safe_name)

    if not safe_name.endswith(".wav") or not os.path.exists(path):
        return JSONResponse(status_code=404, content={"error": "audio not found"})

    return FileResponse(path=path, media_type="audio/wav", filename=safe_name)


# -----------------------------
# Run Directly
# -----------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
