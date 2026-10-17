"use client";

import React, { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { UserState, LocationPoint, WS_BASE, API_BASE } from "@/lib/api";
import {
  Users,
  Search,
  ChevronRight,
  Smartphone,
  Navigation,
  RefreshCw,
  Battery,
  Menu,
  X,
  Radio,
  Car,
  User,
  LogOut,
  Shield,
} from "lucide-react";

const LiveMap = dynamic(() => import("@/components/LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-500">
      <RefreshCw className="w-7 h-7 animate-spin text-blue-600 mb-2" />
      <p className="text-xs font-medium">Loading Digital Map Engine...</p>
    </div>
  ),
});

export default function HomePage() {
  const [users, setUsers] = useState<UserState[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserState | null>(null);
  const [userTrail, setUserTrail] = useState<LocationPoint[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "online" | "offline">("all");
  const [wsConnected, setWsConnected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string; full_name?: string } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // Check user session
  useEffect(() => {
    try {
      const stored = localStorage.getItem("gnss_user");
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("gnss_token");
    localStorage.removeItem("gnss_user");
    setCurrentUser(null);
  };

  // Connect to FastAPI WebSockets (Primary Protocol) with HTTP Sync Fallback
  useEffect(() => {
    let isSubscribed = true;
    let fallbackInterval: NodeJS.Timeout | null = null;

    const setupFallbackSync = () => {
      if (fallbackInterval) return;
      fallbackInterval = setInterval(async () => {
        try {
          // Try local FastAPI endpoint first, then serverless API
          let res = await fetch(`${API_BASE}/api/users`).catch(() => null);
          if (!res || !res.ok) {
            res = await fetch("/api/location").catch(() => null);
          }
          if (res && res.ok) {
            const data = await res.json();
            const userList = Array.isArray(data) ? data : data.users || [];
            if (isSubscribed) {
              setUsers(userList);
              setWsConnected(true);
            }
          }
        } catch (e) {}
      }, 2000);
    };

    const connectWebSocket = () => {
      try {
        const wsUrl = `${WS_BASE}/ws/dashboard`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isSubscribed) setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "SNAPSHOT") {
              setUsers(data.users || []);
            } else if (data.type === "LOCATION_UPDATE" || data.type === "USER_STATUS") {
              const updatedUser = data.user;
              setUsers((prevUsers) => {
                const index = prevUsers.findIndex((u) => u.user_id === updatedUser.user_id);
                if (index >= 0) {
                  const copy = [...prevUsers];
                  copy[index] = updatedUser;
                  return copy;
                } else {
                  return [...prevUsers, updatedUser];
                }
              });

              // If currently selected, append to trail
              if (selectedUser && updatedUser.user_id === selectedUser.user_id && updatedUser.last_location) {
                setUserTrail((prev) => [...prev, updatedUser.last_location]);
              }
            }
          } catch (e) {
            console.error("Error parsing WS packet:", e);
          }
        };

        ws.onerror = () => {
          setupFallbackSync();
        };

        ws.onclose = () => {
          if (isSubscribed) {
            setWsConnected(false);
            setupFallbackSync();
            setTimeout(connectWebSocket, 4000);
          }
        };
      } catch (err) {
        setupFallbackSync();
      }
    };

    connectWebSocket();

    return () => {
      isSubscribed = false;
      if (wsRef.current) wsRef.current.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [selectedUser?.user_id]);

  const handleSelectUser = async (user: UserState) => {
    setSelectedUser(user);
    try {
      let res = await fetch(`${API_BASE}/api/history/${user.user_id}`).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(`/api/location?userId=${user.user_id}`).catch(() => null);
      }
      if (res && res.ok) {
        const data = await res.json();
        const historyPoints = Array.isArray(data) ? data : data.history || [];
        setUserTrail(historyPoints);
      }
    } catch (err) {
      console.error("Failed to load history trail:", err);
    }
    setMobileDrawerOpen(false);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.user_name.toLowerCase().includes(searchQuery.toLowerCase());
    if (filter === "online") return matchesSearch && u.is_online;
    if (filter === "offline") return matchesSearch && !u.is_online;
    return matchesSearch;
  });

  const onlineCount = users.filter((u) => u.is_online).length;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F4F6F9] text-[#1E293B]">
      {/* Navigation Header */}
      <header className="h-14 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <Radio className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <h1 className="font-bold text-xs sm:text-base tracking-tight text-slate-900 whitespace-nowrap">
                <span className="hidden sm:inline">GNSS Position Monitor</span>
                <span className="sm:hidden">GNSS Monitor</span>
              </h1>
              <span className="hidden md:inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                Live
              </span>
            </div>
            <p className="text-[10px] text-slate-500 hidden sm:block truncate">
              Real-Time Location Tracking & Data Visualization
            </p>
          </div>
        </div>

        {/* Right Utility & Navigation Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          <div
            className="flex items-center space-x-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
            title={wsConnected ? "Telemetry Stream Connected" : "Connecting..."}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                wsConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span className="text-slate-600 font-medium hidden md:inline text-xs">
              {wsConnected ? "Telemetry Connected" : "Connecting..."}
            </span>
          </div>

          {currentUser ? (
            <div className="flex items-center space-x-2 pl-1 border-l border-slate-200">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-800 leading-tight">
                  {currentUser.full_name || currentUser.username}
                </span>
                <span className="text-[10px] text-blue-600 font-medium capitalize">
                  {currentUser.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign In</span>
            </Link>
          )}

          <Link
            href="/tracker"
            target="_blank"
            className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open GNSS Tracker</span>
            <span className="sm:hidden text-[11px]">Tracker</span>
          </Link>

          <button
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 border border-slate-200 text-slate-700"
            title="Toggle Vehicle List"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar (Desktop View) */}
        <aside
          className={`hidden md:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 z-10 shrink-0 ${
            sidebarOpen ? "w-80 lg:w-96" : "w-0 overflow-hidden border-none"
          }`}
        >
          {/* Sidebar Header & Stats */}
          <div className="p-3.5 border-b border-slate-200 space-y-3 bg-slate-50/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Tracked Vehicles ({users.length})
              </span>
              <div className="flex items-center space-x-1.5 text-xs">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-slate-600 font-medium">{onlineCount} Active</span>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search vehicle or device ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex rounded-lg bg-slate-200/60 p-0.5 text-xs font-medium">
              <button
                onClick={() => setFilter("all")}
                className={`flex-1 py-1 rounded-md transition-all text-center ${
                  filter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({users.length})
              </button>
              <button
                onClick={() => setFilter("online")}
                className={`flex-1 py-1 rounded-md transition-all text-center ${
                  filter === "online" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Active ({onlineCount})
              </button>
              <button
                onClick={() => setFilter("offline")}
                className={`flex-1 py-1 rounded-md transition-all text-center ${
                  filter === "offline" ? "bg-white text-slate-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Inactive ({users.length - onlineCount})
              </button>
            </div>
          </div>

          {/* Vehicle List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Navigation className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
                <p className="font-medium text-slate-600">No vehicles located</p>
                <p className="text-[11px] mt-1 text-slate-400">
                  Open the GNSS Tracker in another browser tab or mobile to register a vehicle stream.
                </p>
                <Link
                  href="/tracker"
                  target="_blank"
                  className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium text-xs transition-colors"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Launch Tracker</span>
                </Link>
              </div>
            ) : (
              filteredUsers.map((u) => {
                const isSelected = selectedUser?.user_id === u.user_id;
                const speed = u.last_location?.speed || 0;
                return (
                  <div
                    key={u.user_id}
                    onClick={() => handleSelectUser(u)}
                    className={`p-3.5 cursor-pointer transition-all hover:bg-slate-50 ${
                      isSelected ? "bg-blue-50/70 border-l-4 border-l-blue-600" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            u.is_online ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          <Car className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{u.user_name}</p>
                          <p className="text-[10px] font-mono text-slate-400 truncate">ID: {u.user_id}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            u.is_online ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {u.is_online ? `${speed.toFixed(0)} km/h` : "Offline"}
                        </span>
                      </div>
                    </div>

                    {u.last_location && (
                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100/80 pt-2 font-mono">
                        <span>
                          {u.last_location.lat.toFixed(4)}°, {u.last_location.lng.toFixed(4)}°
                        </span>
                        <div className="flex items-center space-x-1 text-slate-400">
                          <Battery className="w-3 h-3" />
                          <span>{u.battery ?? 100}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Info */}
          <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Leaflet &bull; MySQL &bull; FastAPI</span>
            <span className="font-mono text-slate-400">OpenStreetMap</span>
          </div>
        </aside>

        {/* Sidebar Collapse Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden md:flex absolute top-1/2 -translate-y-1/2 z-20 w-4 h-12 bg-white border border-slate-200 border-l-0 rounded-r items-center justify-center shadow-sm text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          style={{ left: sidebarOpen ? "20rem" : "0" }}
          title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${sidebarOpen ? "rotate-180" : ""}`} />
        </button>

        {/* Center / Right: Interactive Map Canvas */}
        <main className="flex-1 h-full w-full relative z-0">
          <LiveMap
            users={users}
            selectedUser={selectedUser}
            userTrail={userTrail}
            onSelectUser={(u) => handleSelectUser(u)}
          />

          {/* Quick HUD Overlay (Top Right of Map) */}
          <div className="absolute top-4 right-4 z-[500] bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-xl p-2.5 shadow-lg hidden sm:flex items-center space-x-4 text-xs">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Fleet Status</p>
              <p className="font-bold text-slate-800">
                {onlineCount} Online <span className="font-normal text-slate-400">/ {users.length} Total</span>
              </p>
            </div>
            {selectedUser && (
              <div className="border-l border-slate-200 pl-4">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Focused Vehicle</p>
                <p className="font-bold text-blue-600">{selectedUser.user_name}</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Drawer (Vehicles List on phones) */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setMobileDrawerOpen(false)} />
          <div className="relative w-4/5 max-w-sm bg-white h-full shadow-2xl flex flex-col z-10">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Tracked Fleet</span>
              <button onClick={() => setMobileDrawerOpen(false)} className="p-1 rounded-lg hover:bg-slate-200 text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
              {filteredUsers.map((u) => (
                <div
                  key={u.user_id}
                  onClick={() => handleSelectUser(u)}
                  className="p-3 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  <p className="text-xs font-bold text-slate-900">{u.user_name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">ID: {u.user_id}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
