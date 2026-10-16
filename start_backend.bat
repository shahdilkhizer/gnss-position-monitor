@echo off
echo ====================================================
echo Starting Python FastAPI Multi-Tenant Backend Server
echo API Docs: http://localhost:8000/docs
echo ====================================================
cd backend
call venv\Scripts\activate.bat
uvicorn main:app --reload --host 0.0.0.0 --port 8000
