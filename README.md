# GNSS-Based Real-Time Position Monitoring and Data Visualization System

A high-performance real-time location monitoring and telemetry visualization platform built with **Python (FastAPI)**, **Next.js**, **WebSockets**, **Leaflet.js**, and **MySQL**.

---

## 📌 Project Overview

This project implements a real-time web-based position monitoring system for tracking moving vehicles and field devices on an interactive digital map. It features ultra-low latency coordinate streaming over WebSockets, persistent historical breadcrumb routes stored in a relational database, role-based authentication, and a built-in software-based GNSS location simulator.

### Core Capabilities
* **Live Position Tracking:** Continuous real-time coordinate streaming directly onto an OpenStreetMap canvas.
* **Relational Persistence:** Automated coordinate logging and telemetry archiving using MySQL.
* **Role-Based Access Control:** Distinct authentication workflows for Fleet Managers (monitoring map) and Drivers (transmitters).
* **GNSS Data Simulation:** Generates realistic kinematic movement data (latitude, longitude, speed, heading) for testing and demonstrations without requiring physical GPS hardware.
* **Movement History & Breadcrumbs:** Visualizes traveled routes using historical polyline trails queried from the database.
* **Telemetry Monitoring:** Tracks speed (km/h), connection state, transmission packet count, and device battery level.
* **Responsive Architecture:** Fully optimized for desktop workstations, tablets, and mobile devices.

---

## 🛠️ Technology Stack

* **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
* **Map Visualization:** Leaflet.js, React-Leaflet, OpenStreetMap
* **Backend:** Python 3.10+, FastAPI, Uvicorn (ASGI)
* **Database & ORM:** MySQL 8.0 / MariaDB, SQLAlchemy ORM, PyMySQL
* **Real-Time Protocol:** Native WebSockets (Full-Duplex)
* **Authentication:** JSON Web Tokens (JWT) + Bcrypt Password Hashing

---

## 📋 Prerequisites

Ensure the following tools are installed on your machine before running the project:
1. **Node.js** (v18.0 or higher) & **npm**
2. **Python** (v3.10 or higher)
3. **MySQL Server** (v8.0+ or XAMPP / MariaDB)

---

## 🗄️ Database Setup (MySQL)

### Step 1: Ensure MySQL Server is Running
Make sure your MySQL service is active (via Windows Services `MySQL80` or XAMPP Control Panel).

### Step 2: Database Initialization
The application can automatically create the required database `gnss_db` and tables upon backend startup. 

Alternatively, you can manually import the provided schema script:
```bash
# Using MySQL Command Line or PowerShell:
mysql -u root -p < database/schema.sql
```

### Step 3: Configure Database Credentials
Create a `.env` file inside the `backend/` directory (or edit `backend/.env`):
```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password_here
MYSQL_DB=gnss_db

JWT_SECRET=gnss_super_secret_university_key_2026
```
> **Note:** If MySQL credentials are not provided or the service is temporarily unreachable, the backend includes an intelligent fallback mechanism to SQLite (`gnss_local.db`) to ensure uninterrupted presentation evaluation without system crashes.

---

## 🚀 Step-by-Step Execution Guide

### 1. Start the Backend API Server (Python FastAPI)

Open a terminal in the project directory:
```powershell
cd backend

# Create and activate virtual environment (Windows)
python -m venv venv
.\venv\Scripts\activate

# On macOS/Linux:
# python3 -m venv venv
# source venv/bin/activate

# Install required dependencies
pip install -r requirements.txt

# Start ASGI Web Server
uvicorn main:app --reload --port 8000
```
* **Backend API:** `http://localhost:8000`
* **Interactive API Documentation (Swagger UI):** `http://localhost:8000/docs`

---

### 2. Start the Frontend Application (Next.js)

Open a second terminal in the project root:
```powershell
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```
* **Web Application:** `http://localhost:3000`

---

## 🔐 Default Evaluation Credentials

The system comes pre-seeded with default role-based accounts for instant demonstration:

| Role | Username | Password | Default Destination |
| :--- | :--- | :--- | :--- |
| **Fleet Manager** | `manager` | `admin123` | `/` (Central Fleet Monitoring Map) |
| **Field Driver** | `driver1` | `driver123` | `/tracker` (GNSS Field Transmitter) |

---

## 📱 Application Routes & Workflow

| Route | Name | Purpose |
| :--- | :--- | :--- |
| **`/login`** | Authentication Portal | Role-based sign-in with quick 1-click test fill buttons |
| **`/`** | Operations Dashboard | Interactive OpenStreetMap displaying live vehicle positions, telemetry stats, and breadcrumb route history |
| **`/tracker`** | Field Transmitter | Mobile-friendly device transmitter with physical GPS and GNSS kinematic simulation toggle |

### Demonstration Workflow:
1. Open `http://localhost:3000/login` and sign in as **Manager** (`manager` / `admin123`). This opens the **Operations Dashboard**.
2. Open a separate browser window (or mobile browser) at `http://localhost:3000/tracker` and sign in as **Driver** (`driver1` / `driver123`).
3. On the Tracker screen, click **START**. (Enable *GNSS Simulation Mode* if presenting on a desktop or indoor laptop).
4. Observe the live vehicle movement, speed telemetry, and historical breadcrumb path updating immediately on the Manager map canvas in real time.

---

## 📂 Project Architecture

```
geo-tracker/
├── backend/
│   ├── venv/                   # Python Virtual Environment (gitignored)
│   ├── auth.py                 # JWT token generation & bcrypt password hashing
│   ├── connection_manager.py   # WebSocket real-time connection manager
│   ├── database.py             # SQLAlchemy engine & MySQL connection setup
│   ├── main.py                 # FastAPI application, REST endpoints & WebSocket handlers
│   ├── models.py               # SQLAlchemy ORM models & Pydantic schemas
│   ├── requirements.txt        # Python library dependencies
│   └── .env.example            # Environment configuration template
├── database/
│   └── schema.sql              # MySQL DDL table schemas & seed data
├── frontend/
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/page.tsx  # Authentication UI
│   │   │   ├── tracker/page.tsx# Mobile/Web GNSS transmitter UI
│   │   │   └── page.tsx        # Central operations map dashboard
│   │   ├── components/
│   │   │   └── LiveMap.tsx     # Leaflet.js interactive map engine
│   │   └── lib/
│   │       └── api.ts          # Backend API & WebSocket client interfaces
│   ├── package.json            # Node.js dependencies
│   └── tailwind.config.ts      # UI styling configuration
└── README.md                   # Comprehensive project documentation
```
