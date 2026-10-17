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
  Globe,
  Mail,
  UserCheck,
  Edit2,
  Save,
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
  onUserUpdated?: (user: ManagedUser) => void;
}

export default function AdminSettingsModal({ isOpen, onClose, currentUser, onUserUpdated }: AdminSettingsModalProps) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [activeTab, setActiveTab] = useState<"users" | "create" | "edit">("users");
  const [isLoading, setIsLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state for creating new user
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCountry, setNewCountry] = useState("Pakistan");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("agent");

  // Form state for editing existing user
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCountry, setEditCountry] = useState("Pakistan");
  const [editRole, setEditRole] = useState("agent");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editNewPassword, setEditNewPassword] = useState("");

  const getPersistedCustomUsers = (): ManagedUser[] => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("gnss_custom_users");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  };

  const savePersistedCustomUsers = (list: ManagedUser[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("gnss_custom_users", JSON.stringify(list));
    } catch (e) {}
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      let apiUsers: ManagedUser[] = [];
      try {
        const res = await fetch(`${API_BASE}/api/admin/users`);
        if (res.ok) {
          apiUsers = await res.json();
        }
      } catch (e) {}

      const localUsers = getPersistedCustomUsers();
      const map = new Map<string, ManagedUser>();

      apiUsers.forEach((u) => map.set(u.username.toLowerCase(), u));
      localUsers.forEach((u) => {
        if (!map.has(u.username.toLowerCase())) {
          map.set(u.username.toLowerCase(), u);
        } else {
          const existing = map.get(u.username.toLowerCase())!;
          map.set(u.username.toLowerCase(), {
            ...existing,
            ...u,
          });
        }
      });

      const merged = Array.from(map.values());
      setUsers(merged);
      savePersistedCustomUsers(merged);
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

  const startEditUser = (user: ManagedUser) => {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditFullName(user.full_name || user.username);
    setEditEmail(user.email || "");
    setEditCountry(user.country || "Pakistan");
    setEditRole(user.role);
    setEditIsActive(user.is_active);
    setEditNewPassword("");
    setActionMsg(null);
    setActiveTab("edit");
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setActionMsg(null);

    try {
      const payload: any = {
        username: editUsername.trim(),
        full_name: editFullName.trim(),
        email: editEmail.trim(),
        country: editCountry.trim(),
        role: editRole,
        is_active: editIsActive,
      };

      if (editNewPassword.trim()) {
        payload.new_password = editNewPassword.trim();
      }

      let resData: any = null;
      try {
        const res = await fetch(`${API_BASE}/api/admin/users/${editingUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          resData = await res.json();
        }
      } catch (e) {}

      const updatedObj: ManagedUser = {
        id: editingUser.id,
        username: editUsername.trim(),
        full_name: editFullName.trim(),
        email: editEmail.trim(),
        country: editCountry.trim(),
        role: editRole,
        is_active: editIsActive,
      };

      const existingLocal = getPersistedCustomUsers().filter(
        (u) => u.id !== editingUser.id && u.username.toLowerCase() !== editingUser.username.toLowerCase()
      );
      savePersistedCustomUsers([...existingLocal, updatedObj]);

      setActionMsg({ type: "success", text: `User '${updatedObj.username}' updated successfully.` });
      if (onUserUpdated && currentUser && updatedObj.username === currentUser.username) {
        onUserUpdated(updatedObj);
      }
      fetchUsers();
      setActiveTab("users");
      setEditingUser(null);
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to save user updates." });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMsg(null);

    try {
      let data: any = null;
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

        if (res.ok) {
          data = await res.json();
        }
      } catch (e) {}

      const createdObj: ManagedUser = {
        id: data?.id || Date.now(),
        username: newUsername.trim(),
        full_name: newFullName.trim() || newUsername.trim(),
        email: newEmail.trim() || `${newUsername.trim()}@ubit.edu.pk`,
        country: newCountry.trim() || "Pakistan",
        role: newRole,
        is_active: true,
      };

      const existingLocal = getPersistedCustomUsers().filter(
        (u) => u.username.toLowerCase() !== createdObj.username.toLowerCase()
      );
      savePersistedCustomUsers([...existingLocal, createdObj]);

      setActionMsg({ type: "success", text: `User '${createdObj.username}' created successfully with role '${createdObj.role}'.` });
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
      try {
        await fetch(`${API_BASE}/api/admin/users/${userId}`, {
          method: "DELETE",
        });
      } catch (e) {}

      const remaining = getPersistedCustomUsers().filter(
        (u) => u.id !== userId && u.username.toLowerCase() !== username.toLowerCase()
      );
      savePersistedCustomUsers(remaining);

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
              <h2 className="text-base font-bold text-white tracking-tight">System Administration</h2>
              <p className="text-xs text-slate-400">User Provisioning & Information Management</p>
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
            <span>All Users ({users.length})</span>
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
            <span>Add User</span>
          </button>

          {editingUser && (
            <button
              onClick={() => setActiveTab("edit")}
              className={`px-4 py-2 border-b-2 transition-all flex items-center space-x-1.5 ${
                activeTab === "edit"
                  ? "border-blue-600 text-blue-600 bg-white rounded-t-lg shadow-2xs"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <Edit2 className="w-4 h-4" />
              <span>Update: @{editingUser.username}</span>
            </button>
          )}
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

          {/* TAB 1: USER LIST WITH EDIT & DELETE */}
          {activeTab === "users" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">
                  Click the <strong>Edit (Pencil)</strong> icon on any user to update their name, role, email, or credentials.
                </p>
                <button
                  onClick={() => setActiveTab("create")}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>New User</span>
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
                      <th className="p-3 text-right">Update / Action</th>
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
                        <td className="p-3 text-right space-x-1">
                          <button
                            onClick={() => startEditUser(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Update User Information"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {u.username !== currentUser?.username && (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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

          {/* TAB 2: UPDATE USER (EDIT USER FORM) */}
          {activeTab === "edit" && editingUser && (
            <form onSubmit={handleUpdateUser} className="space-y-4 max-w-xl mx-auto">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between">
                <div>
                  Updating Account: <strong className="font-mono">@{editingUser.username}</strong>
                </div>
                <span className="text-[10px] uppercase font-bold text-blue-600">ID: {editingUser.id}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Username (Used for Login)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-bold">@</span>
                    <input
                      type="text"
                      required
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      placeholder="e.g. driver1"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-mono font-bold"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Required to sign in to the portal at /login</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Full Name / Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder="e.g. Vehicle 01 - Field Driver"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="e.g. agent@ubit.edu.pk"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Country
                  </label>
                  <input
                    type="text"
                    value={editCountry}
                    onChange={(e) => setEditCountry(e.target.value)}
                    placeholder="Pakistan"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Role Privilege
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-medium"
                  >
                    <option value="agent">Field Agent (Driver)</option>
                    <option value="manager">Fleet Operations Manager</option>
                    <option value="admin">System Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Account Status
                  </label>
                  <select
                    value={editIsActive ? "active" : "inactive"}
                    onChange={(e) => setEditIsActive(e.target.value === "active")}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-medium"
                  >
                    <option value="active">Active (Access Allowed)</option>
                    <option value="inactive">Suspended (Access Blocked)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Reset Password (Leave blank to keep current)
                </label>
                <input
                  type="password"
                  value={editNewPassword}
                  onChange={(e) => setEditNewPassword(e.target.value)}
                  placeholder="Enter new password if updating"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("users");
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save User Information</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: CREATE NEW USER */}
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
        </div>
      </div>
    </div>
  );
}
