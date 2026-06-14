@echo off
REM =====================================================================
REM  Arya Chatbot - One-Click Launcher (Windows)
REM  Starts: Ollama -> FastAPI backend -> Frontend -> opens browser.
REM  Double-click this file to run everything.
REM =====================================================================

title Arya Launcher
cd /d "%~dp0"

echo ============================================
echo   Starting Arya Chatbot...
echo ============================================
echo.

REM --- 1. Start Ollama server (LLM engine) -----------------------------
echo [1/4] Starting Ollama server...
start "Ollama" ollama serve
timeout /t 3 >nul

REM --- 2. Ensure the "arya" model exists (build from Modelfile) --------
echo [2/4] Checking Arya model...
ollama show arya >nul 2>&1
if errorlevel 1 (
    echo    Model "arya" not found - building from arya.Modelfile...
    pushd "%~dp0backend"
    ollama create arya -f arya.Modelfile
    popd
) else (
    echo    Model "arya" is ready.
)

REM --- 3. Start the FastAPI backend (port 8000) -----------------------
echo [3/4] Starting backend (http://localhost:8000)...
if exist "%~dp0backend\venv\Scripts\activate.bat" (
    start "Arya Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate.bat && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
) else (
    echo    No venv found - using system Python.
    start "Arya Backend" cmd /k "cd /d %~dp0backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
)

REM --- 4. Start the frontend static server (port 5500) ----------------
echo [4/4] Starting frontend (http://localhost:5500)...
start "Arya Frontend" cmd /k "cd /d %~dp0frontend && python -m http.server 5500"

REM --- Wait for servers to come up, then open the demo site -----------
echo.
echo Waiting for servers to start...
timeout /t 6 >nul

start "" http://localhost:5500/demo-site.html

echo.
echo ============================================
echo   Arya is running!
echo   Demo site : http://localhost:5500/demo-site.html
echo   Full page : http://localhost:5500/chatbot.html
echo   Backend   : http://localhost:8000/health
echo.
echo   Close the opened windows to stop Arya.
echo ============================================
echo.
pause
