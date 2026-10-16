"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { UserState, LocationPoint } from "@/lib/api";

interface LiveMapProps {
  users: UserState[];
  selectedUser: UserState | null;
  onSelectUser: (user: UserState) => void;
  userTrail?: LocationPoint[];
}

function MapController({ center }: { center?: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, 15, { duration: 1.2 });
    }
  }, [center, map]);
  return null;
}

function createVehicleMarkerIcon(user: UserState, isSelected: boolean) {
  const isOnline = user.is_online;
  const initial = (user.user_name || "V").charAt(0).toUpperCase();

  const primaryBg = isSelected ? "#1E40AF" : isOnline ? "#2563EB" : "#64748B";
  const statusColor = isOnline ? "#10B981" : "#64748B";

  const html = `
    <div class="relative flex flex-col items-center group cursor-pointer" style="transform: translate(-50%, -100%);">
      <!-- Device/Vehicle Label Tag -->
      <div class="mb-1 px-2 py-0.5 rounded shadow-sm text-[11px] font-semibold whitespace-nowrap border ${
        isSelected
          ? "bg-slate-900 text-white border-slate-900"
          : "bg-white text-slate-800 border-slate-300"
      } flex items-center space-x-1">
        <span class="w-2 h-2 rounded-full inline-block" style="background-color: ${statusColor};"></span>
        <span>${user.user_name}</span>
      </div>

      <!-- Vehicle Pin Body -->
      <div class="relative flex items-center justify-center w-8 h-8 rounded-full shadow-md border-2 border-white transition-transform ${
        isSelected ? "scale-110" : ""
      }" style="background-color: ${primaryBg};">
        <span class="text-white font-bold text-xs">${initial}</span>
      </div>

      <!-- Pin Notch -->
      <div class="w-2 h-2 -mt-1 rotate-45 border-r border-b border-white" style="background-color: ${primaryBg};"></div>
    </div>
  `;

  return L.divIcon({
    html: html,
    className: "custom-leaflet-marker",
    iconSize: [40, 52],
    iconAnchor: [20, 52],
  });
}

export default function LiveMap({ users, selectedUser, onSelectUser, userTrail = [] }: LiveMapProps) {
  const firstUserLoc = users.find((u) => u.last_location?.lat && u.last_location?.lng)?.last_location;
  const defaultCenter: [number, number] = firstUserLoc
    ? [firstUserLoc.lat, firstUserLoc.lng]
    : [24.8607, 67.0011];

  const targetCenter: [number, number] | undefined = selectedUser?.last_location
    ? [selectedUser.last_location.lat, selectedUser.last_location.lng]
    : undefined;

  const polylineCoords: [number, number][] = userTrail.map((p) => [p.lat, p.lng]);

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
        style={{ minHeight: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController center={targetCenter} />

        {/* Vehicle Route Trail Polyline */}
        {polylineCoords.length > 1 && (
          <Polyline
            positions={polylineCoords}
            pathOptions={{
              color: "#2563EB",
              weight: 4,
              opacity: 0.85,
              dashArray: "6, 8",
            }}
          />
        )}

        {/* Device/Vehicle Markers */}
        {users.map((user) => {
          if (!user.last_location || !user.last_location.lat || !user.last_location.lng) return null;

          const isSelected = selectedUser?.user_id === user.user_id;

          return (
            <Marker
              key={user.user_id}
              position={[user.last_location.lat, user.last_location.lng]}
              icon={createVehicleMarkerIcon(user, isSelected)}
              eventHandlers={{
                click: () => onSelectUser(user),
              }}
            >
              <Popup>
                <div className="p-3 w-64 text-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                        {user.user_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-sm text-slate-900 leading-tight">
                        {user.user_name}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                        user.is_online
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {user.is_online ? "Transmitting" : "Offline"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-1.5 text-[11px] text-slate-600 mb-2">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Speed</span>
                      <span className="font-semibold text-slate-800">
                        {(user.last_location.speed || 0).toFixed(1)} km/h
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Battery</span>
                      <span className="font-semibold text-slate-800">
                        {user.battery || 100}%
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-[10px]">Coordinates</span>
                      <span className="font-mono text-slate-700">
                        {user.last_location.lat.toFixed(5)}, {user.last_location.lng.toFixed(5)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Last Signal:</span>
                    <span className="font-medium text-slate-600">
                      {new Date(user.last_updated * 1000).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
