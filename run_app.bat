@echo off
title GNSS Real-Time Position Monitor Launcher
echo ====================================================================
echo  Launching GNSS-Based Real-Time Position Monitoring System
echo ====================================================================
echo.

echo [1/3] Starting Python FastAPI Backend Server (Port 8000)...
start "GNSS Backend (FastAPI)" cmd /k "cd backend && call venv\Scripts\activate.bat && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

echo [2/3] Waiting for Backend to initialize...
timeout /t 3 /nobreak >nul

echo [3/3] Starting Next.js Web Application (Port 3000)...
start "GNSS Frontend (Next.js)" cmd /k "cd frontend && npm run dev"

echo.
echo ====================================================================
echo  Both Backend (Port 8000) and Frontend (Port 3000) are running!
echo  Opening browser at: http://localhost:3000
echo ====================================================================
timeout /t 4 /nobreak >nul
start http://localhost:3000
