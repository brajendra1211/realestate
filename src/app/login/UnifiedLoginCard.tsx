"use client";

import { useState } from "react";
import Link from "next/link";
import { LoginForm } from "./LoginForm";
import { BuyerLoginForm } from "../buyer/login/BuyerLoginForm";

export function UnifiedLoginCard({ callbackUrl }: { callbackUrl: string }) {
  const [roleTab, setRoleTab] = useState<"buyer" | "agent" | "admin">("buyer");
  const [agentAuthMode, setAgentAuthMode] = useState<"password" | "otp">("password");

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-9 shadow-xl shadow-slate-900/5">
      {/* 3 Main Role Tabs: Buyer, Agent, Admin */}
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-100 p-1.5 border border-slate-200/70 mb-6">
        {/* Tab 1: Buyer */}
        <button
          type="button"
          onClick={() => setRoleTab("buyer")}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs sm:text-sm font-black transition-all cursor-pointer ${
            roleTab === "buyer"
              ? "bg-white text-blue-700 shadow-sm border border-slate-200/80"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <span>🛒</span>
          <span>Buyer</span>
        </button>

        {/* Tab 2: Agent / Channel Partner */}
        <button
          type="button"
          onClick={() => setRoleTab("agent")}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs sm:text-sm font-black transition-all cursor-pointer ${
            roleTab === "agent"
              ? "bg-white text-emerald-700 shadow-sm border border-slate-200/80"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <span>💼</span>
          <span>Channel Partner</span>
        </button>

        {/* Tab 3: Admin */}
        <button
          type="button"
          onClick={() => setRoleTab("admin")}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 px-2 text-xs sm:text-sm font-black transition-all cursor-pointer ${
            roleTab === "admin"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <span>🛡️</span>
          <span>Admin</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: BUYER LOGIN (Property Kharidne wale)
          ========================================================================= */}
      {roleTab === "buyer" && (
        <div className="space-y-4 animate-fadeIn">
          <div className="rounded-2xl bg-blue-50/80 border border-blue-200/70 p-3.5 text-xs text-blue-900">
            <div className="flex items-center gap-2 font-black text-blue-950 mb-0.5">
              <span>✨</span>
              <span>Buyer Portal • Property Kharidne ya Rent lene ke liye</span>
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
              Apne mobile number se instant login karein. Saved properties, channel partner ring aur visit bookings access karein.
            </p>
          </div>

          <BuyerLoginForm next={callbackUrl !== "/" ? callbackUrl : "/buyer/dashboard"} />

          <div className="pt-2 text-center text-[11px] text-slate-400 font-medium">
            <span>✓ Zero spam • Instant WhatsApp OTP verification</span>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: CHANNEL PARTNER / AGENT LOGIN
          ========================================================================= */}
      {roleTab === "agent" && (
        <div className="space-y-4 animate-fadeIn">
          <div className="rounded-2xl bg-emerald-50/80 border border-emerald-200/70 p-3.5 text-xs text-emerald-900">
            <div className="flex items-center gap-2 font-black text-emerald-950 mb-0.5">
              <span>💼</span>
              <span>Channel Partner & Agent Portal</span>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed font-medium">
              Manage your Agent Shop, customer listings, nearby QR ring alerts, client leads & commission ledger.
            </p>
          </div>

          {/* Sub-toggle: Password vs OTP */}
          <div className="flex items-center justify-end gap-2 text-xs font-bold">
            <span className="text-slate-400 text-[11px]">Sign in with:</span>
            <button
              type="button"
              onClick={() => setAgentAuthMode("password")}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-xs ${
                agentAuthMode === "password"
                  ? "bg-slate-900 text-white font-black"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Password / ID
            </button>
            <button
              type="button"
              onClick={() => setAgentAuthMode("otp")}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-xs ${
                agentAuthMode === "otp"
                  ? "bg-emerald-700 text-white font-black"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Mobile OTP
            </button>
          </div>

          {agentAuthMode === "password" ? (
            <LoginForm callbackUrl={callbackUrl !== "/" ? callbackUrl : "/agent/dashboard"} />
          ) : (
            <BuyerLoginForm next={callbackUrl !== "/" ? callbackUrl : "/agent/dashboard"} />
          )}

          {/* Register Callout for New Agents */}
          <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/50 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <p className="font-black text-emerald-950">New Channel Partner?</p>
              <p className="text-[11px] text-emerald-800">Earn 50% commission split & get exclusive QR badges</p>
            </div>
            <Link
              href="/register/agent"
              className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black px-3.5 py-2 text-center text-xs shadow-2xs transition shrink-0"
            >
              Register Partner ➔
            </Link>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: ADMIN LOGIN (Internal)
          ========================================================================= */}
      {roleTab === "admin" && (
        <div className="space-y-4 animate-fadeIn">
          <div className="rounded-2xl bg-slate-900 text-white p-3.5 text-xs">
            <div className="flex items-center gap-2 font-black mb-0.5">
              <span>🛡️</span>
              <span>Official Admin Sign In</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
              Internal access for administrators to manage channel partners, targets, approvals, and platform settings.
            </p>
          </div>

          <LoginForm callbackUrl={callbackUrl !== "/" ? callbackUrl : "/admin"} />
        </div>
      )}

      {/* Footer Navigation: Link to Owner Portal */}
      <div className="mt-7 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-500">
        <p>
          Property Owner wishing to sell/rent?{" "}
          <Link href="/register" className="font-extrabold text-blue-600 hover:underline">
            List Property (Owner Portal) ➔
          </Link>
        </p>

        <span className="text-[11px] text-slate-400 font-semibold">
          Verified Real Estate Portal
        </span>
      </div>
    </div>
  );
}
