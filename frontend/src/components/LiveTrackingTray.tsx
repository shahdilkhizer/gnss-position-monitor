"use client";

import React from "react";
import {
  Radio,
  Power,
  Sliders,
  Battery,
  Navigation,
  X,
  Gauge,
  Activity,
  CheckCircle2,
  Minimize2,
  Maximize2,
  Lock,
} from "lucide-react";

interface LiveTrackingTrayProps {
  isOpen: boolean;
  onClose: () => void;
  isTracking: boolean;
  isSimulating: boolean;
  speed: number;
  accuracy: number;
  batteryLevel: number;
  pingCount: number;
  currentCoords: { lat: number; lng: number } | null;
  deviceName: string;
  onDeviceNameChange: (name: string) => void;
  onToggleTracking: () => void;
  onToggleSimulation: (enabled: boolean) => void;
  isAdmin?: boolean;
}

export default function LiveTrackingTray({
  isOpen,
  onClose,
  isTracking,
  isSimulating,
  speed,
  accuracy,
  batteryLevel,
  pingCount,
  currentCoords,
  deviceName,
  onDeviceNameChange,
  onToggleTracking,
  onToggleSimulation,
  isAdmin = false,
}: LiveTrackingTrayProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-[600] flex flex-col justify-end sm:justify-start pointer-events-none">
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-t-2xl sm:rounded-2xl shadow-2xl text-white w-full sm:w-96 overflow-hidden pointer-events-auto transition-all animate-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isTracking
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-blue-600/20 text-blue-400 border border-blue-500/30"
              }`}
            >
              <Radio className={`w-4 h-4 ${isTracking ? "animate-pulse" : ""}`} />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white">Live Tracking Mode</h3>
              <p className="text-[10px] text-slate-400 font-mono">
                {isTracking ? "STREAMING TO CENTRAL MAP & MYSQL" : "STANDBY (READY TO TRANSMIT)"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            title="Minimize"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3.5">
          {/* Device Identifier */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Vehicle / Transmitter Name
              </label>
              {!isAdmin ? (
                <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
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
                disabled={isTracking || !isAdmin}
                readOnly={!isAdmin}
                value={deviceName}
                onChange={(e) => isAdmin && onDeviceNameChange(e.target.value)}
                placeholder="e.g. Field Vehicle 01"
                className={`w-full bg-slate-950 border rounded-lg px-2.5 py-1.5 text-xs text-white transition-all font-medium ${
                  !isAdmin
                    ? "border-slate-800 text-slate-300 bg-slate-950/70 cursor-not-allowed select-none pr-8 opacity-90"
                    : "border-slate-700 focus:outline-none focus:border-blue-500"
                } ${isTracking ? "opacity-60" : ""}`}
              />
              {!isAdmin && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                  <Lock className="w-3.5 h-3.5" />
                </div>
              )}
            </div>

            {!isAdmin && (
              <p className="text-[10px] text-slate-500 mt-1 font-sans">
                Transmitter name is configured by System Administrator.
              </p>
            )}
          </div>

          {/* Big Tactile Start / Stop Button */}
          <div className="py-2 flex flex-col items-center justify-center">
            <button
              onClick={onToggleTracking}
              className={`w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-300 shadow-xl ${
                isTracking
                  ? "bg-rose-600/20 border-rose-500 text-rose-400 hover:bg-rose-600/30 shadow-rose-900/40"
                  : "bg-blue-600/20 border-blue-500 text-blue-400 hover:bg-blue-600/30 shadow-blue-900/40"
              }`}
            >
              <Power className={`w-6 h-6 mb-1 ${isTracking ? "animate-pulse text-rose-400" : ""}`} />
              <span className="text-[11px] font-bold tracking-wider">
                {isTracking ? "STOP" : "START"}
              </span>
            </button>
            <span className="text-[10px] text-slate-400 mt-2 font-medium">
              {isTracking ? "Broadcasting live coordinates" : "Click START to commence real-time tracking"}
            </span>
          </div>

          {/* Telemetry Metrics */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2 text-center">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Speed</span>
              <span className="text-base font-bold font-mono text-white">{speed.toFixed(1)}</span>
              <span className="text-[9px] text-slate-500 block">km/h</span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2 text-center">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Accuracy</span>
              <span className="text-base font-bold font-mono text-emerald-400">
                {accuracy > 0 ? `±${accuracy.toFixed(1)}m` : "--"}
              </span>
              <span className="text-[9px] text-slate-500 block">GPS fix</span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2 text-center">
              <span className="text-[9px] uppercase font-bold text-slate-400 block">Packets</span>
              <span className="text-base font-bold font-mono text-blue-400">{pingCount}</span>
              <span className="text-[9px] text-slate-500 block">sent</span>
            </div>
          </div>

          {/* Simulation Mode Toggle */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <div>
                <p className="text-xs font-semibold text-white">GNSS Simulation Mode</p>
                <p className="text-[10px] text-slate-400">Generate kinematic path for indoor presentation</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isSimulating}
                disabled={isTracking}
                onChange={(e) => onToggleSimulation(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Current Coordinates */}
          {currentCoords && (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-center font-mono text-[11px] text-slate-300">
              <span className="text-slate-500">POS: </span>
              {currentCoords.lat.toFixed(5)}°, {currentCoords.lng.toFixed(5)}°
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
