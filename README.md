# 🤖 Arya — BICTU AI Chatbot Widget

**Arya** is a self-hosted, embeddable AI chatbot widget for the BICTU website.  
It runs completely locally — no cloud services, no API keys, no subscription fees.

---

# After Updating the model file you have to run :-
cd backend
ollama create arya -f arya.Modelfile

# check for arya
cd backend
ollama show arya

# run arya on terminal
cd backend
ollama run arya

# Run this script to start the app
cd backend
uvicorn main:app --reload

# Any changes in frontend file 
simply ctrl+shift+R in browser
or re-run the frontend 


## 📁 Project Structure

```
arya-chatbot/
├── backend/
│   ├── main.py              # FastAPI: /health + /chat (streaming POST)
│   ├── hardcoded_rules.py   # keyword→reply rules (no LLM for common queries)
│   ├── persona.py           # Arya's system prompts (casual + deep modes)
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── widget.js            # Self-contained embeddable widget (all HTML/CSS inside)
│   ├── arya-mascot.css      # Pure-CSS robot mascot + animations
│   └── demo-site.html       # Fake BICTU page — includes widget.js to test overlay
└── README.md
```

---

## 🪟 Part A — Windows Setup (Development & Testing)

### Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Python | 3.10+ | https://python.org |
| Ollama | latest | https://ollama.com/download |
| VS Code | any | https://code.visualstudio.com |
| VS Code Live Server extension | any | Extensions panel → "Live Server" |

---

### Step 1 — Install Ollama and pull the model

```powershell
# After installing Ollama, open a new PowerShell terminal and run:
ollama pull qwen3:4b

# Verify it downloaded correctly:
ollama list
```

> **Note:** `qwen3:4b` is about 2.7 GB. Download once, runs fully offline.

---

### Step 2 — Set up Python virtual environment

Open PowerShell in the `arya-chatbot/backend` folder:

```powershell
# Navigate to the backend folder
cd "C:\Users\bipar\OneDrive\Desktop\Aryabhat Ai\arya-chatbot\backend"

# Create virtual environment
python -m venv venv

# Activate it
.\venv\Scripts\Activate.ps1

# If you get an execution policy error, run this first:
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Install dependencies
pip install -r requirements.txt
```

---

### Step 3 — Start Ollama server

```powershell
# In a SEPARATE PowerShell window (keep it running):
ollama serve
```

> Ollama will listen on `http://localhost:11434`. Leave this window open.

---

### Step 4 — Start the FastAPI backend

```powershell
# Back in your venv-activated PowerShell (backend folder):
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

**Test it:**
- Open browser → `http://localhost:8000/health`
- You should see: `{"status": "ok", "arya": "ready", "ollama": "ok", ...}`

---

### Step 5 — Open the demo site with Live Server

1. Open VS Code.
2. Open the `arya-chatbot/frontend` folder.
3. Right-click `demo-site.html` → **"Open with Live Server"**.
4. Browser opens at `http://127.0.0.1:5500/demo-site.html`.
5. Wait 2 seconds — the Arya speech bubble should appear bottom-right! 🎉

> **Why Live Server?** Opening `demo-site.html` directly as `file://` may block
> the `fetch()` to `localhost:8000` in some browsers due to CORS. Live Server
> serves it over HTTP properly.

---

### Quick-start (all 3 commands)

```powershell
# Terminal 1 — Ollama
ollama serve

# Terminal 2 — Backend (in backend/ with venv activated)
.\venv\Scripts\Activate.ps1
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 3 — Frontend (VS Code Live Server, or):
cd frontend
python -m http.server 5500
# then open http://localhost:5500/demo-site.html
```

---

### Optional — Set environment variables (Windows)

```powershell
# In the backend terminal, before uvicorn:
$env:OLLAMA_HOST = "http://localhost:11434"
$env:MODEL_CASUAL = "qwen3:4b"
$env:MODEL_DEEP   = "qwen3:4b"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 🐧 Part B — Ubuntu Server Deploy (RTX 3050 8GB GPU)

**Server IP:** `10.140.10.27`

### Step 1 — Install Ollama on Ubuntu

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Step 2 — Pull the larger model (benefits from GPU)

```bash
ollama pull qwen3:8b
```

> Ollama auto-detects the RTX 3050 and offloads layers to VRAM. `qwen3:8b` fits
> in 8 GB with 4-bit quantization.

### Step 3 — Start Ollama server (bind to all interfaces)

```bash
OLLAMA_HOST=0.0.0.0 ollama serve &
```

Or create a systemd service so it survives reboots:

```bash
sudo nano /etc/systemd/system/ollama.service
```

```ini
[Unit]
Description=Ollama LLM Server
After=network.target

[Service]
ExecStart=/usr/local/bin/ollama serve
Environment="OLLAMA_HOST=0.0.0.0"
Restart=always
User=ubuntu

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now ollama
```

### Step 4 — Set up Python backend

```bash
sudo apt install python3-pip python3-venv -y
cd ~/arya-chatbot/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Step 5 — Configure environment variables for GPU models

```bash
export OLLAMA_HOST="http://localhost:11434"
export MODEL_CASUAL="qwen3:8b"
export MODEL_DEEP="qwen3:8b"
```

Or add to `~/.bashrc` / a `.env` file for persistence.

### Step 6 — Run backend (production-ready with Gunicorn)

```bash
# Simple (dev):
uvicorn main:app --host 0.0.0.0 --port 8000

# Production (multiple workers):
pip install gunicorn
gunicorn main:app -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 --workers 2
```

### Step 7 — Update widget.js API URL

Open `frontend/widget.js` and change line ~25:

```js
// BEFORE (local dev):
const ARYA_API_URL = "http://localhost:8000";

// AFTER (Ubuntu server):
const ARYA_API_URL = "http://10.140.10.27:8000";
```

### Step 8 — Serve frontend

```bash
cd ~/arya-chatbot/frontend
python3 -m http.server 9000
# Frontend now at http://10.140.10.27:9000/demo-site.html
```

> Or copy the `frontend/` folder into your existing web server's document root
> (Nginx/Apache) and include `<script src="widget.js"></script>` on any page.

### Step 9 — Open firewall ports (if needed)

```bash
sudo ufw allow 8000/tcp   # FastAPI backend
sudo ufw allow 9000/tcp   # Frontend (if using http.server)
```

---

## 🔊 Part C — Swapping Browser TTS for Neural TTS (Ubuntu GPU)

Currently Arya uses the **browser's built-in Web Speech API** for text-to-speech.
This is convenient but sounds robotic and lacks Hindi quality.

### Recommended upgrade: Server-side neural TTS

When running on the Ubuntu RTX 3050 server, replace browser TTS with one of:

| Option | Quality | Language | Setup |
|--------|---------|----------|-------|
| **Indic Parler-TTS** | ★★★★★ | Hindi, Bengali, etc. | `pip install git+https://github.com/AI4Bharat/Parler-TTS` |
| **XTTS-v2 (Coqui)** | ★★★★★ | 17 languages incl. Hindi | `pip install TTS` |
| **Piper TTS** | ★★★☆☆ | Fast, CPU-friendly | https://github.com/rhasspy/piper |

### What to add to backend (`main.py`)

```python
# TODO: Add this endpoint for neural TTS on Ubuntu GPU
@app.post("/speak")
async def speak(text: str = Body(...)):
    """
    Generate speech audio from text using neural TTS.
    Returns audio/wav stream.
    
    Replace browser speechSynthesis with this endpoint for:
    - Indic Parler-TTS: pip install git+https://github.com/AI4Bharat/Parler-TTS
    - XTTS-v2: pip install TTS (coqui-ai/TTS)
    Preferred voice: hi-IN female to match Arya's persona.
    """
    # Example with Parler-TTS:
    # audio = parler_model.generate(text, voice="female_hindi")
    # return StreamingResponse(audio_bytes, media_type="audio/wav")
    pass
```

### What to change in `widget.js`

Look for the `speakText()` function. It has a `TODO` comment. Replace the
`speechSynthesis.speak()` call with a `fetch` to `/speak` and play the
returned audio blob:

```js
// TODO: Replace with server-side neural TTS (Indic Parler-TTS / XTTS-v2)
// endpoint /speak when deployed to Ubuntu GPU.

const response = await fetch(`${ARYA_API_URL}/speak`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: plain }),
});
const blob = await response.blob();
const url  = URL.createObjectURL(blob);
const audio = new Audio(url);
audio.play();
```

---

## 🎯 Embedding on the Real BICTU Website

Add exactly **one line** to any existing HTML page:

```html
<script src="http://10.140.10.27:9000/widget.js"></script>
```

That's it. The widget self-injects — no other changes needed.

---

## 🧪 API Reference

### `GET /health`

Returns server + Ollama status.

```json
{
  "status": "ok",
  "arya": "ready",
  "ollama": "ok",
  "ollama_host": "http://localhost:11434",
  "model_casual": "qwen3:4b",
  "model_deep": "qwen3:4b"
}
```

### `POST /chat`

```json
{
  "message": "BICTU ke courses kya hain?",
  "mode": "casual",
  "history": [
    { "role": "user", "content": "hello" },
    { "role": "assistant", "content": "Hello! 👋 ..." }
  ]
}
```

Returns a **streaming plain-text** response (tokens as they arrive).  
Header `X-Arya-Source: rule` → matched a hardcoded rule  
Header `X-Arya-Source: llm` → generated by Ollama

---

## 🐛 Troubleshooting

| Problem | Fix |
|---------|-----|
| `ollama: command not found` | Add Ollama to PATH or reinstall |
| `Connection refused` on `/health` | Make sure `ollama serve` is running in a separate terminal |
| Widget shows CORS error | Ensure backend is running and CORS allows all origins (default) |
| Speech bubble doesn't appear | Check browser console for JS errors; make sure `widget.js` path is correct |
| Mic button missing | Browser doesn't support SpeechRecognition API (use Chrome/Edge) |
| Model response very slow on CPU | Normal — `qwen3:4b` on CPU is ~3-8 tok/s. Use GPU on Ubuntu for speed |
| PowerShell execution policy error | Run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` |

---

*Built with ❤️ for BICTU — completely local, no data leaves your server.*
