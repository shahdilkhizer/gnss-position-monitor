"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, ArrowLeft, KeyRound, ShieldAlert, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { API_BASE } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    status: "admin_reset" | "contact_admin";
    message: string;
    username?: string;
    reset_link?: string;
    role?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Unable to process recovery request.");
      }

      setResult(data);
    } catch (err: any) {
      console.error("Forgot password error:", err);
      setError(err.message || "Failed to reach server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Banner */}
        <div className="bg-slate-950 p-6 text-white text-center border-b border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <KeyRound className="w-7 h-7 text-blue-400" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Credential Recovery
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Account Verification & Security Policy
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

          {result ? (
            <div className="space-y-5">
              {result.status === "admin_reset" ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-3">
                  <div className="flex items-center space-x-2 font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Administrator Verified</span>
                  </div>
                  <p className="text-emerald-700 leading-relaxed">
                    Identity confirmed for Administrator account: <strong className="text-emerald-950 font-mono">{result.username}</strong>.
                  </p>
                  <p className="text-emerald-600 text-[11px]">
                    You may now securely reset your master administrator credentials.
                  </p>
                  <Link
                    href={result.reset_link || "/reset-password"}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs flex items-center justify-center space-x-2 transition-colors mt-2"
                  >
                    <span>Proceed to Password Reset</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-3">
                  <div className="flex items-center space-x-2 font-bold text-amber-900">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Organizational Security Policy Notice</span>
                  </div>
                  <p className="text-amber-800 leading-relaxed">
                    {result.message}
                  </p>
                  <p className="text-amber-700 text-[11px] font-medium">
                    Please contact your designated System Administrator to verify your identity and receive updated login details.
                  </p>
                </div>
              )}

              <Link
                href="/login"
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium text-xs flex items-center justify-center space-x-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Login Screen</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Enter your registered organizational email address to check identity and credential recovery eligibility.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                  Registered Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@organization.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-medium text-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition-all disabled:opacity-60"
              >
                <span>{isLoading ? "Verifying..." : "Verify Credential Request"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Login</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
