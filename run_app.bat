@echo off
echo ==========================================================
echo Launching GeoPulse Multi-Tenant Live Map Tracker...
echo ==========================================================
start "GeoPulse Backend (FastAPI)" cmd /k "cd backend && call venv\Scripts\activate.bat && uvicorn main:app --reload --host 0.0.0.0 --port 8000"
timeout /t 3 /nobreak >nul
start "GeoPulse Frontend (Next.js)" cmd /k "cd frontend && npm run dev"
echo.
echo Both Backend (Port 8000) and Frontend (Port 3000) are starting!
echo Once ready, open your browser at: http://localhost:3000
echo ==========================================================
timeout /t 5
