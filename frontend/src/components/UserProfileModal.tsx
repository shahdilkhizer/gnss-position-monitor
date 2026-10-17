"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Mail,
  Globe,
  Lock,
  Shield,
  CheckCircle2,
  AlertCircle,
  Save,
  KeyRound,
} from "lucide-react";
import { API_BASE } from "@/lib/api";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    id?: number;
    username: string;
    email?: string;
    role: string;
    full_name?: string;
    country?: string;
  } | null;
  onProfileUpdated: (updatedUser: any) => void;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
}: UserProfileModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("Pakistan");

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.full_name || currentUser.username || "");
      setEmail(currentUser.email || "");
      setCountry(currentUser.country || "Pakistan");
      setShowPasswordChange(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMsg(null);
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (showPasswordChange) {
      if (!currentPassword) {
        setMsg({ type: "error", text: "Please enter your current password to authorize changes." });
        return;
      }
      if (newPassword !== confirmPassword) {
        setMsg({ type: "error", text: "New password and confirmation do not match." });
        return;
      }
      if (newPassword.length < 6) {
        setMsg({ type: "error", text: "New password must be at least 6 characters." });
        return;
      }
    }

    setIsLoading(true);

    try {
      const payload: any = {
        user_id: currentUser.id,
        full_name: fullName.trim(),
        email: email.trim(),
        country: country.trim(),
      };

      if (showPasswordChange && newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }

      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to update profile.");
      }

      // Update storage and notify parent
      const updatedUser = {
        ...currentUser,
        full_name: data.full_name,
        email: data.email,
        country: data.country,
      };
      localStorage.setItem("gnss_user", JSON.stringify(updatedUser));
      localStorage.setItem("gnss_device_name", data.full_name || data.username);
      onProfileUpdated(updatedUser);

      setMsg({ type: "success", text: "Profile information updated successfully in MySQL!" });
      setShowPasswordChange(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setMsg({ type: "error", text: err.message || "Failed to save profile changes." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Account Profile & Settings</h2>
              <p className="text-xs text-slate-400">Update Personal Details & Security Credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {msg && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                msg.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {msg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{msg.text}</span>
            </div>
          )}

          {/* User Identity Badges */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Username</span>
              <span className="font-mono font-bold text-slate-800">@{currentUser.username}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Assigned Role</span>
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  currentUser.role === "admin"
                    ? "bg-purple-100 text-purple-700 border border-purple-200"
                    : currentUser.role === "manager"
                    ? "bg-blue-100 text-blue-700 border border-blue-200"
                    : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                }`}
              >
                {currentUser.role === "admin"
                  ? "System Admin"
                  : currentUser.role === "manager"
                  ? "Fleet Manager"
                  : "Field Agent"}
              </span>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Syed Khizer"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@ubit.edu.pk"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Country
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Pakistan"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Toggle Change Password Section */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPasswordChange(!showPasswordChange)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{showPasswordChange ? "Cancel Password Change" : "Change Account Password"}</span>
              </button>

              {showPasswordChange && (
                <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm disabled:opacity-60"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isLoading ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
