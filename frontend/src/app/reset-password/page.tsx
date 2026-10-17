"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { API_BASE } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Missing or invalid reset token. Please request a new recovery link.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please verify both inputs.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Password reset failed. Token may be expired.");
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2500);
    } catch (err: any) {
      setError(err.message || "Unable to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
      {/* Banner */}
      <div className="bg-slate-950 p-6 text-white text-center border-b border-slate-800">
        <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-3 shadow-inner">
          <ShieldCheck className="w-7 h-7 text-blue-400" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          Reset Administrator Password
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Establish Secure Master Credentials
        </p>
      </div>

      <div className="p-6 sm:p-8">
        {isSuccess ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h3 className="text-sm font-bold text-emerald-900">Password Reset Successful!</h3>
            <p className="text-xs text-emerald-700">
              Your password has been securely updated. Redirecting to login portal...
            </p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-60"
            >
              <span>{isLoading ? "Saving Credentials..." : "Update Password & Continue"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <Suspense fallback={<div className="text-white text-xs">Loading recovery token...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
