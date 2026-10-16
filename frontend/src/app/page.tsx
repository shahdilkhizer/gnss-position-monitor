"use client";

import React, { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  fetchUserHistory,
  UserState,
  LocationPoint,
  WS_BASE,
} from "@/lib/api";
import {
  Users,
  Search,
  ExternalLink,
  ChevronRight,
  Smartphone,
  Navigation,
  RefreshCw,
  Battery,
  MapPin,
  Menu,
  X,
  Radio,
  Car,
  Activity,
  Layers,
} from "lucide-react";

// Dynamically import LiveMap with SSR disabled
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

  const wsRef = useRef<WebSocket | null>(null);

  // Connect to central WebSocket dashboard
  useEffect(() => {
    const wsUrl = `${WS_BASE}/ws/dashboard`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "SNAPSHOT") {
          setUsers(msg.users || []);
        } else if (msg.type === "LOCATION_UPDATE" || msg.type === "USER_STATUS") {
          const updatedUser: UserState = msg.user;
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

          if (selectedUser?.user_id === updatedUser.user_id && updatedUser.last_location) {
            setUserTrail((prev) => [...prev, updatedUser.last_location!]);
          }
        }
      } catch (err) {
        console.error("WS Parse error:", err);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [selectedUser?.user_id]);

  const handleSelectUser = async (user: UserState) => {
    setSelectedUser(user);
    const trail = await fetchUserHistory(user.user_id);
    setUserTrail(trail);
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
      <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Radio className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-base tracking-tight text-slate-900">
                GNSS Position Monitor
              </h1>
              <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                Live System
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Real-Time Location Tracking & Data Visualization
            </p>
          </div>
        </div>

        {/* Right Utility & Navigation Controls */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Live Sync Status Indicator */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                wsConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
              }`}
            />
            <span className="text-slate-600 font-medium">
              {wsConnected ? "Live Sync Active" : "Connecting..."}
            </span>
          </div>

          {/* Open GNSS Simulator / Tracker Screen */}
          <Link
            href="/tracker"
            target="_blank"
            className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">Open GNSS Tracker</span>
            <span className="sm:hidden">Tracker</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </Link>

          {/* Mobile Drawer Toggle */}
          <button
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 border border-slate-200 text-slate-700"
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
              <div className="flex items-center space-x-2">
                <Car className="w-4 h-4 text-blue-600" />
                <h2 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Tracked Vehicles & Devices
                </h2>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-200 font-semibold text-slate-600">
                {onlineCount} Online / {users.length} Total
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vehicle or device ID..."
                className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex bg-slate-200/60 p-0.5 rounded-lg text-[11px]">
              <button
                onClick={() => setFilter("all")}
                className={`flex-1 py-1 rounded-md font-semibold transition-all ${
                  filter === "all" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({users.length})
              </button>
              <button
                onClick={() => setFilter("online")}
                className={`flex-1 py-1 rounded-md font-semibold transition-all ${
                  filter === "online" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Online ({onlineCount})
              </button>
              <button
                onClick={() => setFilter("offline")}
                className={`flex-1 py-1 rounded-md font-semibold transition-all ${
                  filter === "offline" ? "bg-white text-slate-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Offline ({users.length - onlineCount})
              </button>
            </div>
          </div>

          {/* Tracked Vehicles Cards List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center p-6 text-slate-500">
                <Navigation className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-800">No vehicles or devices active</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Open the GNSS Tracker link to start simulated or live GPS transmission.
                </p>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = selectedUser?.user_id === user.user_id;
                return (
                  <div
                    key={user.user_id}
                    onClick={() => handleSelectUser(user)}
                    className={`p-3 rounded-lg cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-blue-50/80 border-blue-300 shadow-sm"
                        : "hover:bg-slate-50 border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                            {user.user_name.charAt(0).toUpperCase()}
                          </div>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                              user.is_online ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 leading-tight">
                            {user.user_name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {user.is_online ? "Transmitting Position" : "Offline"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 text-[11px] text-slate-500">
                        {user.battery !== undefined && (
                          <span className="flex items-center text-[10px] text-slate-500">
                            <Battery className="w-3 h-3 mr-0.5 text-slate-400" />
                            {user.battery}%
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>

                    {user.last_location ? (
                      <div className="mt-2 text-[10px] bg-slate-50 p-1.5 rounded border border-slate-200 flex items-center justify-between text-slate-600">
                        <span className="font-mono">
                          {user.last_location.lat.toFixed(4)}, {user.last_location.lng.toFixed(4)}
                        </span>
                        <span className="font-semibold text-blue-600">
                          {(user.last_location.speed || 0).toFixed(0)} km/h
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-2.5 border-t border-slate-200 bg-slate-50 text-[10px] text-slate-500 flex items-center justify-between">
            <span>GNSS Position Monitoring System</span>
            <span className="font-mono text-slate-400">OpenStreetMap</span>
          </div>
        </aside>

        {/* Sidebar Collapse Toggle Button (Desktop) */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden md:flex absolute top-1/2 -translate-y-1/2 z-20 w-4 h-12 bg-white border border-slate-200 border-l-0 rounded-r items-center justify-center shadow-sm text-slate-500 hover:text-slate-900 hover:bg-slate-50"
          style={{ left: sidebarOpen ? "20rem" : "0" }}
          title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${sidebarOpen ? "rotate-180" : ""}`} />
        </button>

        {/* Right Area: Full Map Canvas */}
        <main className="flex-1 h-full relative z-0">
          <LiveMap
            users={users}
            selectedUser={selectedUser}
            onSelectUser={handleSelectUser}
            userTrail={userTrail}
          />

          {/* Floating Mobile Button */}
          <div className="md:hidden absolute bottom-4 left-4 right-4 z-10">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="w-full bg-white text-slate-900 border border-slate-200 p-3 rounded-xl shadow-lg flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <Car className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold">Tracked Vehicles</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
                  {onlineCount} Active
                </span>
              </div>
              <span className="text-xs text-blue-600 font-semibold flex items-center">
                View List <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </span>
            </button>
          </div>
        </main>

        {/* Mobile Slide-Up Drawer */}
        {mobileDrawerOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/40 flex flex-col justify-end">
            <div className="bg-white rounded-t-2xl max-h-[75vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom">
              <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Car className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-900">
                    Tracked Vehicles ({users.length})
                  </span>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1 rounded text-slate-500 hover:text-slate-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto p-2 space-y-1 divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <div
                    key={user.user_id}
                    onClick={() => handleSelectUser(user)}
                    className="p-2.5 rounded-lg hover:bg-slate-50 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                        {user.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{user.user_name}</p>
                        <p className="text-[10px] text-slate-500">
                          {user.is_online ? "Active" : "Offline"} • {user.battery || 100}% Battery
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-blue-600">Locate</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
