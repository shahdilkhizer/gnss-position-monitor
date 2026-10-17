@echo off
title GNSS Backend Server
echo ====================================================================
echo  Starting GNSS Real-Time Position Monitoring API (FastAPI)
echo  API Documentation: http://localhost:8000/docs
echo ====================================================================
echo.
cd backend
call venv\Scripts\activate.bat
uvicorn main:app --reload --host 0.0.0.0 --port 8000
