"use client";

import React, { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserState, LocationPoint, WS_BASE, API_BASE } from "@/lib/api";
import {
  Users,
  Search,
  ChevronRight,
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
  Settings,
  Power,
  Sliders,
  Edit3,
} from "lucide-react";
import AdminSettingsModal from "@/components/AdminSettingsModal";
import LiveTrackingTray from "@/components/LiveTrackingTray";
import UserProfileModal from "@/components/UserProfileModal";

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
  const router = useRouter();

  // Authentication & Role State
  const [currentUser, setCurrentUser] = useState<{
    id?: number;
    username: string;
    role: string; // 'admin', 'manager', 'agent'
    full_name?: string;
    email?: string;
  } | null>(null);

  // Map & Fleet Telemetry State
  const [users, setUsers] = useState<UserState[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserState | null>(null);
  const [userTrail, setUserTrail] = useState<LocationPoint[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "online" | "offline">("all");
  const [wsConnected, setWsConnected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Admin In-Place Settings Modal
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState(false);
  // User Profile & Info Update Modal
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // In-Place Live Tracking State (No Page Reload)
  const [isTrackingTrayOpen, setIsTrackingTrayOpen] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [trackingSpeed, setTrackingSpeed] = useState(0);
  const [trackingAccuracy, setTrackingAccuracy] = useState(0);
  const [pingCount, setPingCount] = useState(0);
  const [batteryLevel, setBatteryLevel] = useState(95);
  const [deviceName, setDeviceName] = useState("Vehicle 01");
  const [deviceId, setDeviceId] = useState("");

  const wsDashboardRef = useRef<WebSocket | null>(null);
  const wsTrackerRef = useRef<WebSocket | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Check Session & Initialize Identity
  useEffect(() => {
    try {
      const stored = localStorage.getItem("gnss_user");
      if (!stored) {
        router.push("/login");
        return;
      }
      const userObj = JSON.parse(stored);
      setCurrentUser(userObj);
      setDeviceName(userObj.full_name || userObj.username);

      let savedId = localStorage.getItem("gnss_device_id");
      if (!savedId) {
        savedId = `DEV-${Math.floor(1000 + Math.random() * 9000)}`;
        localStorage.setItem("gnss_device_id", savedId);
      }
      setDeviceId(savedId);

      // Check battery
      if (typeof navigator !== "undefined" && "getBattery" in navigator) {
        (navigator as any).getBattery().then((battery: any) => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      }
    } catch (e) {
      router.push("/login");
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("gnss_token");
    localStorage.removeItem("gnss_user");
    router.push("/login");
  };

  // 2. Connect Central Dashboard WebSocket
  useEffect(() => {
    let isSubscribed = true;
    let fallbackInterval: NodeJS.Timeout | null = null;

    const setupFallback = () => {
      if (fallbackInterval) return;
      fallbackInterval = setInterval(async () => {
        try {
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

    const connectDashboardWS = () => {
      try {
        const ws = new WebSocket(`${WS_BASE}/ws/dashboard`);
        wsDashboardRef.current = ws;

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
              setUsers((prev) => {
                const idx = prev.findIndex((u) => u.user_id === updatedUser.user_id);
                if (idx >= 0) {
                  const copy = [...prev];
                  copy[idx] = updatedUser;
                  return copy;
                } else {
                  return [...prev, updatedUser];
                }
              });

              if (selectedUser && updatedUser.user_id === selectedUser.user_id && updatedUser.last_location) {
                setUserTrail((prev) => [...prev, updatedUser.last_location]);
              }
            }
          } catch (e) {}
        };

        ws.onerror = () => setupFallback();
        ws.onclose = () => {
          if (isSubscribed) {
            setWsConnected(false);
            setupFallback();
            setTimeout(connectDashboardWS, 4000);
          }
        };
      } catch (e) {
        setupFallback();
      }
    };

    connectDashboardWS();

    return () => {
      isSubscribed = false;
      if (wsDashboardRef.current) wsDashboardRef.current.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [selectedUser?.user_id]);

  // 3. In-Place Live Tracking Functions
  const transmitLocation = async (lat: number, lng: number, spd: number, acc: number) => {
    setPingCount((p) => p + 1);

    // Stream via WebSocket if available
    if (wsTrackerRef.current && wsTrackerRef.current.readyState === WebSocket.OPEN) {
      try {
        wsTrackerRef.current.send(
          JSON.stringify({
            type: "LOCATION",
            lat,
            lng,
            accuracy: acc,
            speed: spd,
            battery: batteryLevel,
            user_name: deviceName,
            timestamp: Date.now() / 1000,
          })
        );
        return;
      } catch (e) {}
    }

    // HTTP fallback to FastAPI ping or serverless
    try {
      await fetch(`${API_BASE}/api/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: deviceId || "DEV-1",
          user_name: deviceName,
          location: {
            lat,
            lng,
            speed: spd,
            accuracy: acc,
            battery: batteryLevel,
          },
        }),
      }).catch(() => null);
    } catch (e) {}
  };

  const startTracking = () => {
    setIsTracking(true);

    try {
      const wsUrl = `${WS_BASE}/ws/tracker/${deviceId}?name=${encodeURIComponent(deviceName)}`;
      const ws = new WebSocket(wsUrl);
      wsTrackerRef.current = ws;
    } catch (e) {}

    if (isSimulating) {
      startSimulation();
    } else {
      startRealGPS();
    }
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
    if (wsTrackerRef.current) {
      wsTrackerRef.current.close();
      wsTrackerRef.current = null;
    }
  };

  const startRealGPS = () => {
    if (!("geolocation" in navigator)) {
      startSimulation();
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc, speed: spd } = pos.coords;
        setCurrentCoords({ lat: latitude, lng: longitude });
        setTrackingAccuracy(acc);
        const calculatedSpd = spd ? spd * 3.6 : 0;
        setTrackingSpeed(calculatedSpd);
        transmitLocation(latitude, longitude, calculatedSpd, acc);
      },
      (err) => {
        // Fallback to simulation if GPS denied
        startSimulation();
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );
    watchIdRef.current = id;
  };

  const startSimulation = () => {
    let lat = 24.8607 + (Math.random() - 0.5) * 0.02;
    let lng = 67.0011 + (Math.random() - 0.5) * 0.02;
    setCurrentCoords({ lat, lng });
    setTrackingAccuracy(4.5);
    setTrackingSpeed(26.0);
    transmitLocation(lat, lng, 26.0, 4.5);

    const interval = setInterval(() => {
      lat += (Math.random() - 0.48) * 0.0006;
      lng += (Math.random() - 0.48) * 0.0006;
      const simSpeed = 20 + Math.random() * 15;
      setCurrentCoords({ lat, lng });
      setTrackingSpeed(simSpeed);
      transmitLocation(lat, lng, simSpeed, 4.5);
    }, 2500);

    simIntervalRef.current = interval;
  };

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
    } catch (err) {}
    setMobileDrawerOpen(false);
  };

  // Role Permissions
  const isAgent = currentUser?.role === "agent" || currentUser?.role === "driver";
  const isManagerOrAdmin = currentUser?.role === "manager" || currentUser?.role === "admin";
  const isAdmin = currentUser?.role === "admin";

  // Filter users for sidebar (Managers/Admins see all; Agents see only themselves if present)
  const visibleUsers = isAgent
    ? users.filter((u) => u.user_id === deviceId || u.user_name === deviceName)
    : users;

  const filteredUsers = visibleUsers.filter((u) => {
    const matchesSearch = u.user_name.toLowerCase().includes(searchQuery.toLowerCase());
    if (filter === "online") return matchesSearch && u.is_online;
    if (filter === "offline") return matchesSearch && !u.is_online;
    return matchesSearch;
  });

  const onlineCount = visibleUsers.filter((u) => u.is_online).length;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F4F6F9] text-[#1E293B]">
      {/* Top Operations Header */}
      <header className="h-14 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
            <Radio className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <h1 className="font-bold text-xs sm:text-base tracking-tight text-slate-900 whitespace-nowrap">
                GNSS Position Monitor
              </h1>
              <span className="hidden md:inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                Live
              </span>
            </div>
            <p className="text-[10px] text-slate-500 hidden sm:block truncate">
              Real-Time Location Tracking & Telemetry Visualization
            </p>
          </div>
        </div>

        {/* Right Actions & Session Menu */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Telemetry Stream Status Badge */}
          <div
            className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
            title={wsConnected ? "WebSocket Stream Online" : "Connecting..."}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                wsConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span className="text-slate-600 font-medium text-xs">
              {wsConnected ? "Stream Active" : "Connecting..."}
            </span>
          </div>

          {/* In-Place Live Tracking Toggle Button */}
          <button
            onClick={() => setIsTrackingTrayOpen(!isTrackingTrayOpen)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all ${
              isTracking
                ? "bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isTracking ? "Live Tracking ON" : "Live Tracking Mode"}
            </span>
            <span className="sm:hidden text-[11px]">
              {isTracking ? "Tracking" : "Track"}
            </span>
          </button>

          {/* Admin Settings Button (In-Place Modal) */}
          {isAdmin && (
            <button
              onClick={() => setIsAdminSettingsOpen(true)}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
              title="System Administration & User Management"
            >
              <Settings className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden md:inline">Settings</span>
            </button>
          )}

          {/* User Profile Badge & Logout */}
          {currentUser && (
            <div className="flex items-center space-x-1.5 sm:space-x-2 pl-2 border-l border-slate-200">
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center space-x-2 py-1 px-1.5 sm:px-2 rounded-lg hover:bg-slate-100 transition-colors text-left"
                title="Click to Update Profile & Credentials"
              >
                <div className="w-7 h-7 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0 shadow-2xs">
                  {(currentUser.full_name || currentUser.username).charAt(0).toUpperCase()}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-900 leading-tight flex items-center space-x-1">
                    <span>{currentUser.full_name || currentUser.username}</span>
                    <Edit3 className="w-2.5 h-2.5 text-blue-500" />
                  </span>
                  <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">
                    {currentUser.role === "admin"
                      ? "System Admin"
                      : currentUser.role === "manager"
                      ? "Fleet Manager"
                      : "Field Agent"} &bull; <span className="underline">Update Info</span>
                  </span>
                </div>
              </button>

              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Mobile Drawer Toggle (For Managers/Admins on Phones) */}
          {isManagerOrAdmin && (
            <button
              onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
              className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 border border-slate-200 text-slate-700"
              title="Toggle Fleet List"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: ONLY shown for Manager or System Administrator */}
        {isManagerOrAdmin && (
          <aside
            className={`hidden md:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 z-10 shrink-0 ${
              sidebarOpen ? "w-80 lg:w-96" : "w-0 overflow-hidden border-none"
            }`}
          >
            {/* Sidebar Header & Search */}
            <div className="p-3.5 border-b border-slate-200 space-y-3 bg-slate-50/70">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Tracked Fleet ({visibleUsers.length})
                </span>
                <div className="flex items-center space-x-1.5 text-xs">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-600 font-medium">{onlineCount} Active</span>
                </div>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search vehicle or device ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 placeholder-slate-400"
                />
              </div>

              <div className="flex rounded-lg bg-slate-200/60 p-0.5 text-xs font-medium">
                <button
                  onClick={() => setFilter("all")}
                  className={`flex-1 py-1 rounded-md transition-all text-center ${
                    filter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All ({visibleUsers.length})
                </button>
                <button
                  onClick={() => setFilter("online")}
                  className={`flex-1 py-1 rounded-md transition-all text-center ${
                    filter === "online" ? "bg-white text-emerald-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Active ({onlineCount})
                </button>
                <button
                  onClick={() => setFilter("offline")}
                  className={`flex-1 py-1 rounded-md transition-all text-center ${
                    filter === "offline" ? "bg-white text-slate-700 shadow-2xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Inactive ({visibleUsers.length - onlineCount})
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
                    Click <strong>Live Tracking Mode</strong> above to broadcast this device.
                  </p>
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
                              u.is_online
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-500"
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

            <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Leaflet &bull; MySQL 8.0 &bull; FastAPI</span>
              <span className="font-mono text-slate-400">OpenStreetMap</span>
            </div>
          </aside>
        )}

        {/* Sidebar Collapse Toggle Button (For Manager / Admin) */}
        {isManagerOrAdmin && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex absolute top-1/2 -translate-y-1/2 z-20 w-4 h-12 bg-white border border-slate-200 border-l-0 rounded-r items-center justify-center shadow-xs text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            style={{ left: sidebarOpen ? "20rem" : "0" }}
            title={sidebarOpen ? "Collapse Fleet Sidebar" : "Expand Fleet Sidebar"}
          >
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${sidebarOpen ? "rotate-180" : ""}`} />
          </button>
        )}

        {/* Center / Right: Interactive Map Canvas */}
        <main className="flex-1 h-full w-full relative z-0">
          <LiveMap
            users={visibleUsers}
            selectedUser={selectedUser}
            userTrail={userTrail}
            onSelectUser={(u) => handleSelectUser(u)}
          />

          {/* Floating Tracking HUD Chip (When Live Tracking is Active) */}
          {isTracking && (
            <div className="absolute top-4 left-4 z-[500] bg-slate-900/90 text-white backdrop-blur-md border border-emerald-500/50 rounded-xl px-3 py-2 shadow-xl flex items-center space-x-3 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <div>
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  Live Broadcasting Active
                </p>
                <p className="font-mono text-xs">
                  {trackingSpeed.toFixed(0)} km/h &bull; {currentCoords ? `${currentCoords.lat.toFixed(4)}°, ${currentCoords.lng.toFixed(4)}°` : "Acquiring..."}
                </p>
              </div>
              <button
                onClick={() => setIsTrackingTrayOpen(true)}
                className="ml-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-md text-[10px] font-semibold text-slate-300"
              >
                Controls
              </button>
            </div>
          )}

          {/* Quick HUD Overlay for Managers/Admins */}
          {isManagerOrAdmin && (
            <div className="absolute top-4 right-4 z-[500] bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-xl p-2.5 shadow-lg hidden sm:flex items-center space-x-4 text-xs">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Fleet Status</p>
                <p className="font-bold text-slate-800">
                  {onlineCount} Online <span className="font-normal text-slate-400">/ {visibleUsers.length} Total</span>
                </p>
              </div>
              {selectedUser && (
                <div className="border-l border-slate-200 pl-4">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Focused</p>
                  <p className="font-bold text-blue-600">{selectedUser.user_name}</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* In-Place Live Tracking Controls Tray */}
      <LiveTrackingTray
        isOpen={isTrackingTrayOpen}
        onClose={() => setIsTrackingTrayOpen(false)}
        isTracking={isTracking}
        isSimulating={isSimulating}
        speed={trackingSpeed}
        accuracy={trackingAccuracy}
        batteryLevel={batteryLevel}
        pingCount={pingCount}
        currentCoords={currentCoords}
        deviceName={deviceName}
        onDeviceNameChange={(name) => {
          setDeviceName(name);
          localStorage.setItem("gnss_device_name", name);
        }}
        onToggleTracking={isTracking ? stopTracking : startTracking}
        onToggleSimulation={(enabled) => setIsSimulating(enabled)}
      />

      {/* In-Place Admin Settings Modal */}
      {isAdmin && (
        <AdminSettingsModal
          isOpen={isAdminSettingsOpen}
          onClose={() => setIsAdminSettingsOpen(false)}
          currentUser={currentUser}
        />
      )}

      {/* In-Place User Profile & Credentials Update Modal (Available for all roles) */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onProfileUpdated={(updated) => {
          setCurrentUser(updated);
          setDeviceName(updated.full_name || updated.username);
        }}
      />

      {/* Mobile Drawer (For Manager/Admin on Phones) */}
      {mobileDrawerOpen && isManagerOrAdmin && (
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
