# GNSS-Based Real-Time Position Monitoring and Data Visualization System

A high-performance real-time location monitoring and telemetry visualization platform built with **Python (FastAPI)**, **Next.js**, **WebSockets**, and **Leaflet.js**.

---

## 📌 Project Overview

This project implements a web-based position monitoring system for tracking moving vehicles and field devices on an interactive digital map. It features ultra-low latency coordinate streaming over WebSockets, historical breadcrumb route tracking, and a built-in software-based GNSS location simulator.

### Core Capabilities
* **Live Position Tracking:** Continuous real-time coordinate streaming directly onto an OpenStreetMap canvas.
* **GNSS Data Simulation:** Generates realistic kinematic movement data (latitude, longitude, speed, heading) for testing and demonstrations without requiring physical GPS hardware.
* **Movement History & Breadcrumbs:** Visualizes traveled routes using historical polyline trails.
* **Telemetry Monitoring:** Tracks speed (km/h), connection state, transmission count, and device battery level.
* **Responsive Architecture:** Accessible from desktop workstations, tablets, and mobile web browsers.

---

## 🛠️ Technology Stack

* **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS
* **Map Visualization:** Leaflet.js, React-Leaflet, OpenStreetMap
* **Backend:** Python 3, FastAPI, Uvicorn (ASGI)
* **Real-Time Protocol:** Native WebSockets (Full-Duplex)
* **Data Transport:** JSON Telemetry Payloads

---

## 🚀 Getting Started

### Prerequisites
* Python 3.10+
* Node.js 18+ and npm

### Quick Start (Local Development)

#### 1. Start the Backend API Server
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
* Backend API: `http://localhost:8000`
* Interactive API Documentation (Swagger UI): `http://localhost:8000/docs`

#### 2. Start the Frontend Application
In a separate terminal window:
```bash
cd frontend
npm install
npm run dev
```
* Web Application: `http://localhost:3000`

---

## 📱 Application Routes

| Route | Description |
| :--- | :--- |
| **`/`** | Central Position Monitoring Dashboard & Digital Map |
| **`/tracker`** | Field Device Transmitter & GNSS Simulation Interface |

---

## 🌐 Deployment Configuration

The application is structured for independent frontend and backend cloud hosting:

### Environment Variables (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=https://your-backend-service.onrender.com
NEXT_PUBLIC_WS_URL=wss://your-backend-service.onrender.com
```

### Hosting Recommendations:
* **Backend:** [Render.com](https://render.com) or [Railway.app](https://railway.app) (Python Web Service)
* **Frontend:** [Vercel.com](https://vercel.com) (Next.js Application)
