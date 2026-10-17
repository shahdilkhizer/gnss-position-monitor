"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Navigation, Shield, User, Key, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { API_BASE } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Authentication failed. Please verify credentials.");
      }

      // Save auth session locally
      localStorage.setItem("gnss_token", data.access_token);
      localStorage.setItem("gnss_user", JSON.stringify(data.user));
      localStorage.setItem("gnss_device_name", data.user.full_name || data.user.username);

      // Role-based redirection
      if (data.user.role === "manager") {
        router.push("/");
      } else {
        router.push("/tracker");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Failed to reach backend server. Please verify FastAPI backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  const quickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header Banner */}
        <div className="bg-slate-950 p-6 text-white text-center border-b border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Navigation className="w-7 h-7 text-blue-400 -rotate-45" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            GNSS Position Monitor
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-Time Vehicle Fleet & Telemetry System
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8">
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. manager or driver1"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-800"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-800"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-60"
            >
              <span>{isLoading ? "Authenticating..." : "Sign In to Portal"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials Box */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 text-center">
              Evaluation & Demo Accounts (1-Click Fill)
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => quickFill("manager", "admin123")}
                className="p-2.5 border border-slate-200 rounded-xl text-left hover:border-blue-400 hover:bg-blue-50/50 transition-all text-xs"
              >
                <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  <span>Manager</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                  manager / admin123
                </div>
                <div className="text-[10px] text-blue-600 mt-1 font-medium">
                  → Central Map
                </div>
              </button>

              <button
                type="button"
                onClick={() => quickFill("driver1", "driver123")}
                className="p-2.5 border border-slate-200 rounded-xl text-left hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-xs"
              >
                <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                  <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Driver</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                  driver1 / driver123
                </div>
                <div className="text-[10px] text-emerald-600 mt-1 font-medium">
                  → Transmitter
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-500">
            MySQL 8.0 &bull; Python FastAPI &bull; Next.js 14
          </p>
        </div>
      </div>
    </div>
  );
}
