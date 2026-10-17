"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Users,
  UserPlus,
  Shield,
  Key,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Database,
  Globe,
  Mail,
  UserCheck,
} from "lucide-react";
import { API_BASE } from "@/lib/api";

interface ManagedUser {
  id: number;
  username: string;
  email?: string;
  role: string;
  full_name?: string;
  country?: string;
  is_active: boolean;
}

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { username: string; role: string; full_name?: string } | null;
}

export default function AdminSettingsModal({ isOpen, onClose, currentUser }: AdminSettingsModalProps) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [activeTab, setActiveTab] = useState<"users" | "create" | "system">("users");
  const [isLoading, setIsLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state for creating new user
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCountry, setNewCountry] = useState("Pakistan");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("agent");

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error("Failed to load users:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setActionMsg(null);
    }
  }, [isOpen]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMsg(null);

    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: newFullName,
          email: newEmail,
          country: newCountry,
          username: newUsername,
          password: newPassword,
          role: newRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to create user.");
      }

      setActionMsg({ type: "success", text: `User '${data.username}' created successfully with role '${data.role}'.` });
      setNewFullName("");
      setNewEmail("");
      setNewUsername("");
      setNewPassword("");
      fetchUsers();
      setActiveTab("users");
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to create user." });
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!confirm(`Are you sure you want to delete user '${username}'?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to delete user.");
      }
      setActionMsg({ type: "success", text: `User '${username}' deleted.` });
      fetchUsers();
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Unable to delete user." });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">System Settings & Administration</h2>
              <p className="text-xs text-slate-400">Role-Based Access Control & User Provisioning</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 pt-2 space-x-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === "users"
                ? "border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-2xs"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Manage Users ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`px-4 py-2 border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === "create"
                ? "border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-2xs"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New User</span>
          </button>
          <button
            onClick={() => setActiveTab("system")}
            className={`px-4 py-2 border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === "system"
                ? "border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-2xs"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Database Status</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {actionMsg && (
            <div
              className={`mb-4 p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                actionMsg.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}
            >
              {actionMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{actionMsg.text}</span>
            </div>
          )}

          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">
                  Provisioned system accounts with active access tokens and assigned roles.
                </p>
                <button
                  onClick={() => setActiveTab("create")}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create User</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 font-bold text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3">User & Name</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Country</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{u.full_name || u.username}</p>
                          <p className="font-mono text-[10px] text-slate-400">@{u.username}</p>
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              u.role === "admin"
                                ? "bg-purple-100 text-purple-700 border border-purple-200"
                                : u.role === "manager"
                                ? "bg-blue-100 text-blue-700 border border-blue-200"
                                : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {u.role === "admin" ? "System Admin" : u.role === "manager" ? "Fleet Manager" : "Field Agent"}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">{u.email || "--"}</td>
                        <td className="p-3 text-slate-500">{u.country || "Pakistan"}</td>
                        <td className="p-3 text-right">
                          {u.username !== currentUser?.username && (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "create" && (
            <form onSubmit={handleCreateUser} className="space-y-4 max-w-xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="e.g. Ali Ahmed"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="ali@ubit.edu.pk"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="username"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Role Privilege
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-medium"
                  >
                    <option value="agent">Field Agent (Driver / Transmitter)</option>
                    <option value="manager">Fleet Manager (Operations Dashboard)</option>
                    <option value="admin">System Administrator (Full Control)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Country
                </label>
                <input
                  type="text"
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                  placeholder="Pakistan"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("users")}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                >
                  Provision User Account
                </button>
              </div>
            </form>
          )}

          {activeTab === "system" && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center space-x-2 text-slate-900 font-bold">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span>Relational Persistence Engine</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-slate-600 font-mono text-[11px]">
                  <div>Engine: <strong>MySQL 8.0 (InnoDB)</strong></div>
                  <div>Database: <strong>gnss_db</strong></div>
                  <div>Connection: <strong>localhost:3306</strong></div>
                  <div>Driver: <strong>SQLAlchemy + PyMySQL</strong></div>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-1">
                <p className="font-bold flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Live Telemetry Protocol Active</span>
                </p>
                <p className="text-[11px] text-emerald-700">
                  Native WebSockets (Full-Duplex) streaming telemetry coordinates into MySQL <code>location_logs</code> table.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
