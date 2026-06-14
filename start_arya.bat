@echo off

start "" ollama serve

timeout /t 3 >nul

start "" cmd /k "cd /d %~dp0backend && venv\Scripts\activate && uvicorn main:app --host 0.0.0.0 --reload"

start "" cmd /k "cd /d %~dp0frontend && python -m http.server 5500"

timeout /t 5 >nul

start "" http://127.0.0.1:5500/demo-site.html