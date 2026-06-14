from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi import UploadFile, File
from fastapi.responses import FileResponse

# STT
from stt import speech_to_text

# Chatbot
from router import get_response

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Chat Request Model
# -----------------------------
class ChatRequest(BaseModel):
    message: str


# -----------------------------
# Chat Endpoint
# -----------------------------
@app.post("/chat")
def chat(req: ChatRequest):

    result = get_response(req.message)

    return result


# -----------------------------
# Speech-to-Text Endpoint
# -----------------------------
@app.post("/speech")
async def speech(file: UploadFile = File(...)):

    temp_file = file.filename

    with open(temp_file, "wb") as f:
        f.write(await file.read())

    text = speech_to_text(temp_file)

    return {
        "text": text
    }

# -----------------------------
# Audio Endpoint (Piper TTS)
# -----------------------------
@app.get("/audio")
def get_audio():

    return FileResponse(
        path="response.wav",
        media_type="audio/wav",
        filename="response.wav"
    )


# -----------------------------
# Run Directly
# -----------------------------
if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )