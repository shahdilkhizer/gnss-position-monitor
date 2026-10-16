"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { WS_BASE } from "@/lib/api";
import {
  Power,
  Navigation,
  Compass,
  Gauge,
  Radio,
  ExternalLink,
  Sliders,
  Battery,
  AlertCircle,
  MapPin,
  Car,
} from "lucide-react";

export default function TrackerPage() {
  const [userName, setUserName] = useState("Vehicle-01");
  const [userId, setUserId] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Live Location metrics
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number | null>(0);
  const [pingCount, setPingCount] = useState(0);
  const [batteryLevel, setBatteryLevel] = useState<number>(95);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize persistent user ID and check battery
  useEffect(() => {
    let savedId = localStorage.getItem("gnss_device_id");
    if (!savedId) {
      savedId = "dev_" + Math.random().toString(36).substring(2, 8);
      localStorage.setItem("gnss_device_id", savedId);
    }
    setUserId(savedId);

    const savedName = localStorage.getItem("gnss_device_name");
    if (savedName) setUserName(savedName);

    // Browser Battery Status API
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
    setUserName(name);
    localStorage.setItem("gnss_device_name", name);
  };

  // Connect WebSocket & Start Location Stream
  const startTracking = () => {
    setErrorMsg(null);

    const wsUrl = `${WS_BASE}/ws/tracker/${userId}?name=${encodeURIComponent(userName)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsTracking(true);

      if (isSimulating) {
        startSimulation(ws);
      } else {
        startRealGeolocation(ws);
      }
    };

    ws.onerror = () => {
      setErrorMsg("Failed to connect to backend server. Make sure Python backend is running!");
    };

    ws.onclose = () => {
      stopTracking();
    };
  };

  const stopTracking = () => {
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
  };

  // Real GPS tracking via HTML5 Geolocation API
  const startRealGeolocation = (ws: WebSocket) => {
    if (!("geolocation" in navigator)) {
      setErrorMsg("Geolocation is not supported by your browser. Please toggle Simulation Mode for testing!");
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy: acc, speed: spd } = position.coords;
        setCurrentCoords({ lat: latitude, lng: longitude });
        setAccuracy(acc);
        setSpeed(spd ? spd * 3.6 : 0);
        setPingCount((p) => p + 1);

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "LOCATION",
              lat: latitude,
              lng: longitude,
              accuracy: acc,
              speed: spd ? spd * 3.6 : 0,
              battery: batteryLevel,
              user_name: userName,
              timestamp: Date.now() / 1000,
            })
          );
        }
      },
      (err) => {
        console.error("GPS error:", err);
        setErrorMsg(`GPS Error: ${err.message}. (Tip: Enable Simulation Mode on laptops/desktops!)`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      }
    );

    watchIdRef.current = id;
  };

  // Simulation mode: Generates realistic smooth movement coordinates
  const startSimulation = (ws: WebSocket) => {
    let lat = 24.8607 + (Math.random() - 0.5) * 0.02;
    let lng = 67.0011 + (Math.random() - 0.5) * 0.02;
    setCurrentCoords({ lat, lng });
    setAccuracy(4.5);
    setSpeed(28.0);

    const interval = setInterval(() => {
      lat += (Math.random() - 0.48) * 0.0006;
      lng += (Math.random() - 0.48) * 0.0006;

      const simSpeed = 20 + Math.random() * 15;
      setCurrentCoords({ lat, lng });
      setSpeed(simSpeed);
      setPingCount((p) => p + 1);

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "LOCATION",
            lat,
            lng,
            accuracy: 4.5,
            speed: simSpeed,
            battery: batteryLevel,
            user_name: userName,
            timestamp: Date.now() / 1000,
          })
        );
      }
    }, 2500);

    simIntervalRef.current = interval;
  };

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-[#1E293B] flex flex-col items-center justify-start p-3 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-5 py-4 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2.5">
            <Radio className="w-5 h-5 text-white" />
            <div>
              <h1 className="text-sm font-bold leading-tight">GNSS Device Transmitter</h1>
              <p className="text-[10px] text-blue-100">Live Position & Telemetry Broadcast</p>
            </div>
          </div>
          <div className="flex items-center space-x-1 text-xs bg-blue-700/80 px-2.5 py-1 rounded-md">
            <Battery className="w-3.5 h-3.5" />
            <span>{batteryLevel}%</span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 space-y-4">
          {/* Vehicle / Device Identifier Input */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Vehicle / Device Identifier
            </label>
            <div className="relative">
              <Car className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                disabled={isTracking}
                value={userName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Vehicle-01 / Device-Alpha"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 disabled:opacity-60"
              />
            </div>
          </div>

          {/* Big Tactile Duty / Tracking Button */}
          <div className="py-2 flex flex-col items-center">
            <button
              onClick={isTracking ? stopTracking : startTracking}
              className={`w-full py-3.5 rounded-lg font-bold text-sm flex items-center justify-center space-x-2 shadow-sm transition-all transform active:scale-[0.98] ${
                isTracking
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              <Power className={`w-4 h-4 ${isTracking ? "animate-pulse" : ""}`} />
              <span>{isTracking ? "Stop Transmitting Position" : "Start Transmitting GNSS Data"}</span>
            </button>

            <p className="text-[11px] text-slate-500 mt-2 flex items-center">
              <span
                className={`w-2 h-2 rounded-full mr-1.5 ${
                  isTracking ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                }`}
              />
              {isTracking ? "Broadcasting live coordinates to Map" : "Press button to begin broadcast"}
            </p>
          </div>

          {/* Telemetry Grid */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 block">Latitude</span>
              <span className="font-mono font-semibold text-slate-900">
                {currentCoords ? currentCoords.lat.toFixed(5) : "--.-----"}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block">Longitude</span>
              <span className="font-mono font-semibold text-slate-900">
                {currentCoords ? currentCoords.lng.toFixed(5) : "--.-----"}
              </span>
            </div>

            <div className="border-t border-slate-200 pt-2">
              <span className="text-[10px] text-slate-500 block">Speed</span>
              <span className="font-bold text-blue-600">
                {speed !== null ? `${speed.toFixed(1)} km/h` : "0.0 km/h"}
              </span>
            </div>

            <div className="border-t border-slate-200 pt-2">
              <span className="text-[10px] text-slate-500 block">Packets Sent</span>
              <span className="font-bold text-slate-900">{pingCount}</span>
            </div>
          </div>

          {/* Simulation Toggle for Lab & Laptop Demos */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-xs font-bold text-slate-900">GNSS Simulator Mode</p>
                <p className="text-[10px] text-slate-500">Generate moving coordinates without physical hardware</p>
              </div>
            </div>
            <button
              disabled={isTracking}
              onClick={() => setIsSimulating(!isSimulating)}
              className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                isSimulating ? "bg-blue-600" : "bg-slate-300"
              } disabled:opacity-50`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                  isSimulating ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Return to Map Link */}
          <div className="pt-1">
            <Link
              href="/"
              className="w-full py-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-blue-600 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Open GNSS Position Monitor Map</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between">
          <span>GNSS Data Visualization System</span>
          <span>Status: Ready</span>
        </div>
      </div>
    </div>
  );
}
