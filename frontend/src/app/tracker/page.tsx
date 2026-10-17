"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { WS_BASE, API_BASE } from "@/lib/api";
import {
  Power,
  Navigation,
  Activity,
  Sliders,
  Battery,
  ShieldCheck,
  Radio,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  User,
  LogOut,
  Lock,
} from "lucide-react";

export default function TrackerPage() {
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("Vehicle 01");
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [speed, setSpeed] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<number>(0);
  const [pingCount, setPingCount] = useState<number>(0);
  const [batteryLevel, setBatteryLevel] = useState<number>(95);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id?: number; username: string; role: string; full_name?: string } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize persistent user ID and check battery
  useEffect(() => {
    try {
      const stored = localStorage.getItem("gnss_user");
      if (stored) {
        const u = JSON.parse(stored);
        setCurrentUser(u);
        const adminName = u.full_name || u.username;
        setUserName(adminName);
        localStorage.setItem("gnss_device_name", adminName);

        // Fetch latest profile from MySQL backend to immediately apply admin name updates
        if (u.id) {
          fetch(`${API_BASE}/api/auth/profile/${u.id}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((latest) => {
              if (latest) {
                setCurrentUser(latest);
                localStorage.setItem("gnss_user", JSON.stringify(latest));
                const latestAdminName = latest.full_name || latest.username;
                setUserName(latestAdminName);
                localStorage.setItem("gnss_device_name", latestAdminName);
              }
            })
            .catch(() => null);
        }
      }
    } catch (e) {}

    let savedId = localStorage.getItem("gnss_device_id");
    if (!savedId) {
      savedId = `DEV-${Math.floor(1000 + Math.random() * 9000)}`;
      localStorage.setItem("gnss_device_id", savedId);
    }
    setUserId(savedId);

    if (typeof navigator !== "undefined" && "getBattery" in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener("levelchange", () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      });
    }
  }, []);

  const handleNameChange = (name: string) => {
    if (currentUser?.role === "admin") {
      setUserName(name);
      localStorage.setItem("gnss_device_name", name);
    }
  };

  const transmitLocation = async (lat: number, lng: number, spd: number, acc: number) => {
    setPingCount((p) => p + 1);

    // 1. Try native WebSocket stream (FastAPI Backend)
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(
          JSON.stringify({
            type: "LOCATION",
            lat,
            lng,
            accuracy: acc,
            speed: spd,
            battery: batteryLevel,
            user_name: userName,
            timestamp: Date.now() / 1000,
          })
        );
        return;
      } catch (e) {
        console.error("WS send failed, falling back to HTTP:", e);
      }
    }

    // 2. HTTP Fallback (Local API / Vercel Serverless)
    try {
      await fetch("/api/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          user_name: userName,
          lat,
          lng,
          speed: spd,
          accuracy: acc,
          battery: batteryLevel,
          is_online: true,
        }),
      }).catch(() => null);
    } catch (err: any) {
      console.error("Transmission error:", err);
    }
  };

  const startTracking = () => {
    setErrorMsg(null);
    setIsTracking(true);

    // Attempt WebSocket connection to FastAPI backend
    try {
      const wsUrl = `${WS_BASE}/ws/tracker/${userId}?name=${encodeURIComponent(userName)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onerror = () => {
        console.warn("FastAPI WebSocket unreachable, continuing with HTTP streaming.");
      };
    } catch (e) {}

    if (isSimulating) {
      startSimulation();
    } else {
      startRealGeolocation();
    }
  };

  const stopTracking = async () => {
    setIsTracking(false);
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      await fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, is_online: false }),
      }).catch(() => null);
    } catch (e) {}
  };

  const startRealGeolocation = () => {
    if (!("geolocation" in navigator)) {
      setErrorMsg("Geolocation is not supported by your browser. Please toggle Simulation Mode for testing!");
      setIsTracking(false);
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy: acc, speed: spd } = position.coords;
        setCurrentCoords({ lat: latitude, lng: longitude });
        setAccuracy(acc);
        const calculatedSpeed = spd ? spd * 3.6 : 0;
        setSpeed(calculatedSpeed);

        transmitLocation(latitude, longitude, calculatedSpeed, acc);
      },
      (err) => {
        console.error("GPS error:", err);
        setErrorMsg(`GPS Notice: ${err.message}. (Tip: Enable Simulation Mode for desktop testing!)`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      }
    );

    watchIdRef.current = id;
  };

  const startSimulation = () => {
    let lat = 24.8607 + (Math.random() - 0.5) * 0.02;
    let lng = 67.0011 + (Math.random() - 0.5) * 0.02;
    setCurrentCoords({ lat, lng });
    setAccuracy(4.5);
    setSpeed(28.0);

    transmitLocation(lat, lng, 28.0, 4.5);

    const interval = setInterval(() => {
      lat += (Math.random() - 0.48) * 0.0006;
      lng += (Math.random() - 0.48) * 0.0006;

      const simSpeed = 20 + Math.random() * 15;
      setCurrentCoords({ lat, lng });
      setSpeed(simSpeed);

      transmitLocation(lat, lng, simSpeed, 4.5);
    }, 2500);

    simIntervalRef.current = interval;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
      {/* Top Header Bar */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between py-2 border-b border-slate-800">
        <Link
          href="/"
          className="flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors py-1 px-2 rounded-lg hover:bg-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Live Map</span>
        </Link>

        <div className="flex items-center space-x-2">
          {currentUser ? (
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-slate-400">
                Logged in as <strong className="text-white">{currentUser.username}</strong>
              </span>
              <Link
                href="/login"
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                title="Switch User"
              >
                <LogOut className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Main Transmitter Card */}
      <div className="max-w-md w-full mx-auto my-auto bg-slate-800/80 backdrop-blur-md border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden">
        {/* Card Header */}
        <div className="p-5 border-b border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white tracking-tight">GNSS Transmitter</h2>
              <p className="text-xs text-slate-400">Field Telemetry Unit</p>
            </div>
          </div>

          <div
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
              isTracking
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                : "bg-slate-700/50 text-slate-400 border-slate-600"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isTracking ? "bg-emerald-400 animate-ping" : "bg-slate-500"
              }`}
            />
            <span>{isTracking ? "TRANSMITTING" : "STANDBY"}</span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Vehicle / Device Identifier
              </label>
              {currentUser?.role !== "admin" ? (
                <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 flex items-center space-x-1">
                  <Lock className="w-2.5 h-2.5 mr-0.5" />
                  <span>Admin Locked</span>
                </span>
              ) : (
                <span className="text-[10px] text-blue-400 font-medium">Admin Editable</span>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                value={userName}
                disabled={isTracking || currentUser?.role !== "admin"}
                readOnly={currentUser?.role !== "admin"}
                onChange={(e) => handleNameChange(e.target.value)}
                className={`w-full bg-slate-900/80 border rounded-lg px-3 py-2 text-sm text-white font-medium transition-all ${
                  currentUser?.role !== "admin"
                    ? "border-slate-800 text-slate-300 bg-slate-950/70 cursor-not-allowed select-none pr-8 opacity-90"
                    : "border-slate-700 focus:outline-none focus:border-blue-500"
                } ${isTracking ? "opacity-60" : ""}`}
              />
              {currentUser?.role !== "admin" && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                  <Lock className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            {currentUser?.role !== "admin" && (
              <p className="text-[10px] text-slate-500 mt-1">
                Vehicle transmitter name is set by Administrator and locked for drivers.
              </p>
            )}

            <div className="flex justify-between items-center mt-1 text-[11px] text-slate-500 font-mono">
              <span>Hardware ID: {userId}</span>
              <span>Battery: {batteryLevel}%</span>
            </div>
          </div>

          {/* Big Tactile Tracking Button */}
          <div className="py-2 flex flex-col items-center">
            <button
              onClick={isTracking ? stopTracking : startTracking}
              className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-300 shadow-xl ${
                isTracking
                  ? "bg-rose-600/20 border-rose-500 text-rose-400 hover:bg-rose-600/30 shadow-rose-900/30"
                  : "bg-blue-600/20 border-blue-500 text-blue-400 hover:bg-blue-600/30 shadow-blue-900/30"
              }`}
            >
              <Power className={`w-8 h-8 mb-1 ${isTracking ? "animate-pulse text-rose-400" : ""}`} />
              <span className="text-xs font-bold tracking-wider">
                {isTracking ? "STOP" : "START"}
              </span>
            </button>
            <span className="text-[11px] text-slate-400 mt-2">
              {isTracking ? "Tap to pause position broadcasting" : "Tap to commence live telemetry stream"}
            </span>
          </div>

          {/* Telemetry Metrics Grid */}
          <div className="grid grid-cols-3 gap-2.5 pt-2">
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-2.5 text-center">
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Speed</span>
              <span className="text-lg font-mono font-bold text-white">{speed.toFixed(1)}</span>
              <span className="text-[10px] text-slate-500 block font-sans">km/h</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-2.5 text-center">
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Accuracy</span>
              <span className="text-lg font-mono font-bold text-emerald-400">
                {accuracy > 0 ? `±${accuracy.toFixed(1)}` : "--"}
              </span>
              <span className="text-[10px] text-slate-500 block font-sans">meters</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-2.5 text-center">
              <span className="text-[10px] text-slate-400 uppercase block font-semibold">Transmissions</span>
              <span className="text-lg font-mono font-bold text-blue-400">{pingCount}</span>
              <span className="text-[10px] text-slate-500 block font-sans">packets</span>
            </div>
          </div>

          {/* Simulation Toggle */}
          <div className="bg-slate-900/60 border border-slate-700/60 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-blue-400" />
              <div>
                <p className="text-xs font-semibold text-white">GNSS Simulation Mode</p>
                <p className="text-[10px] text-slate-400">Generates motion path for indoor/lab demos</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isSimulating}
                disabled={isTracking}
                onChange={(e) => setIsSimulating(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Current Coordinates Banner */}
          {currentCoords && (
            <div className="bg-slate-900/90 border border-slate-700/60 rounded-lg p-2.5 text-center font-mono text-xs text-slate-300">
              <span className="text-slate-500">POS: </span>
              {currentCoords.lat.toFixed(5)}°, {currentCoords.lng.toFixed(5)}°
            </div>
          )}

          {errorMsg && (
            <div className="bg-amber-950/40 border border-amber-800/60 rounded-lg p-2.5 text-[11px] text-amber-300 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-md w-full mx-auto text-center py-2 text-[11px] text-slate-500 font-mono">
        GNSS-Based Real-Time Position Monitoring System
      </div>
    </div>
  );
}
