@echo off
REM ====================================================
REM  Arya Backend Launcher (Windows)
REM  Double-click this file to start the chatbot backend.
REM ====================================================

echo Starting Arya backend...
echo.

REM Move to the backend folder (same dir as this script)
cd /d "%~dp0backend"

REM Use the backend venv if it exists, else system python
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
) else (
    echo No backend venv found - using system Python.
    echo If imports fail, run setup first ^(see README^).
)

REM Small model for Windows CPU testing
set MODEL_CASUAL=qwen3:4b
set MODEL_DEEP=qwen3:4b

python main.py
pause