# GNSS-Based Real-Time Position Monitoring and Data Visualization System

A high-performance real-time location monitoring and telemetry visualization platform built with **Python (FastAPI)**, **Next.js**, **WebSockets**, **Leaflet.js**, and **MySQL 8.0**.

---

## 📌 Project Overview

This project implements an enterprise-grade real-time position monitoring system for tracking vehicles and field devices on an interactive digital map canvas. It features ultra-low latency coordinate streaming over WebSockets, relational database persistence, multi-role access control, in-place live tracking without page reload, an administrative user provisioning suite, and a built-in software GNSS kinematic simulator.

### Core Architecture & Capabilities
* **Single Unified Map Canvas:** All users land on an interactive OpenStreetMap interface with role-tailored viewports:
  * **System Administrator:** Full fleet map + live telemetry sidebar + in-place system settings modal for user and role provisioning.
  * **Fleet Operations Manager:** Full fleet map + live telemetry sidebar + real-time vehicle breadcrumb tracking.
  * **Field Agent / Driver:** Clean focused map canvas (without competitor fleet clutter) + in-place Live Tracking control tray.
* **In-Place Live Tracking Mode:** Users can toggle live position broadcasting, inspect speed/battery metrics, and switch to GNSS simulation mode directly on the map interface with **zero page reload**.
* **First-Time Installation Wizard (`/setup`):** Guided onboarding workflow to configure the primary Root System Administrator account upon initial system deployment.
* **Role-Based Access Control (RBAC):** Distinct privilege sets for `admin`, `manager`, and `agent` accounts.
* **Credential Recovery Policy (`/forgot-password`):** Verified password reset workflow for administrators, and formal administrative authorization directives for staff members.
* **Persistent Telemetry Logs:** High-frequency GNSS coordinates and telemetry packets archived directly into MySQL 8.0 (`location_logs` table).

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

Ensure the following tools are installed on your machine:
1. **Node.js** (v18.0 or higher) & **npm**
2. **Python** (v3.10 or higher)
3. **MySQL Server** (v8.0+ or XAMPP / MariaDB)

---

## 🗄️ Database Setup (MySQL 8.0)

### Step 1: Ensure MySQL Service is Active
Verify that the MySQL service is running (via Windows Services `MySQL80` or XAMPP Control Panel).

### Step 2: Database Initialization
The application will automatically verify and create the required database `gnss_db` and tables upon backend startup.

Alternatively, you can manually import the provided SQL script:
```powershell
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

---

## 🚀 Execution Guide

### ⚡ Option A: 1-Click Launch (Windows)
Simply double-click **`run_app.bat`** in the project root directory:
* Automatically launches the Python FastAPI backend on Port 8000.
* Automatically launches the Next.js frontend on Port 3000.
* Automatically opens your default web browser to `http://localhost:3000`.

---

### 💻 Option B: Manual Terminal Execution

#### 1. Start the Backend API Server (Python FastAPI)

Open a terminal in the project directory:
```powershell
cd backend

# Create and activate virtual environment (Windows)
python -m venv venv
.\venv\Scripts\activate

# Install required dependencies
pip install -r requirements.txt

# Start ASGI Web Server
uvicorn main:app --reload --port 8000
```
* **Backend API:** `http://localhost:8000`
* **Swagger UI API Docs:** `http://localhost:8000/docs`

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

## 🔐 First-Time Setup & Role Roles

### First-Time Initialization:
1. Navigate to `http://localhost:3000`.
2. If the system is fresh, it automatically directs to the **Initial System Setup Wizard (`/setup`)**.
3. Fill in the **Full Name**, **Work Email**, **Country**, **Admin Username**, and **Password**.
4. Click **Complete Setup & Launch Portal** to create the root Administrator.

### Administrative User Provisioning:
1. Log in as the **System Administrator**.
2. Click the **Settings** gear icon in the top navigation bar.
3. Use the in-place **User Management** panel to provision new users and assign roles:
   * `System Administrator`
   * `Fleet Operations Manager`
   * `Field Agent / Driver`

---

## 📱 Application Routes

| Route | Purpose |
| :--- | :--- |
| **`/`** | Central Interactive Map & Operations Canvas with In-Place Live Tracking & Admin Settings Modal |
| **`/setup`** | First-Time System Administrator Installation Wizard |
| **`/login`** | Clean Production Authentication Portal |
| **`/forgot-password`** | Credential Recovery & Security Policy Verification |
| **`/reset-password`** | Secure Administrator Password Reset Form |
| **`/tracker`** | Dedicated Mobile Transmitter Interface |

---

## 📂 Project Architecture

```
geo-tracker/
├── backend/
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
│   ├── src/
│   │   ├── app/
│   │   │   ├── forgot-password/page.tsx # Credential recovery
│   │   │   ├── login/page.tsx           # Authentication portal
│   │   │   ├── reset-password/page.tsx  # Password reset
│   │   │   ├── setup/page.tsx           # Initial setup wizard
│   │   │   ├── tracker/page.tsx         # Dedicated transmitter
│   │   │   └── page.tsx                 # Central operations map dashboard
│   │   ├── components/
│   │   │   ├── AdminSettingsModal.tsx   # In-place user & role management modal
│   │   │   ├── LiveMap.tsx              # Leaflet.js interactive map engine
│   │   │   └── LiveTrackingTray.tsx     # In-place live tracking & HUD control tray
│   │   └── lib/
│   │       └── api.ts                   # Backend API & WebSocket client interfaces
│   ├── package.json            # Node.js dependencies
│   └── tailwind.config.ts      # UI styling configuration
└── README.md                   # Comprehensive project documentation
```
