"use client";

import { useState } from "react";
import Link from "next/link";
import { LoginForm } from "./LoginForm";
import { BuyerLoginForm } from "../buyer/login/BuyerLoginForm";

export function UnifiedLoginCard({ callbackUrl }: { callbackUrl: string }) {
  const [tab, setTab] = useState<"otp" | "password">("otp");

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-7 sm:p-9 shadow-xl shadow-slate-900/5">
      {/* Tab Switcher */}
      <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 p-1.5 border border-slate-200/70 mb-7">
        <button
          type="button"
          onClick={() => setTab("otp")}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            tab === "otp"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <span>💬</span>
          <span>OTP Login</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("password")}
          className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            tab === "password"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/60"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <span>🔑</span>
          <span>ID & Password</span>
        </button>
      </div>

      {/* Tab 1: Universal OTP */}
      {tab === "otp" && (
        <div>
          <div className="mb-5 flex items-center justify-between text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/70 rounded-xl px-3.5 py-2.5">
            <span className="flex items-center gap-1.5">
              <span>✨</span>
              <span>Fast OTP Login for all panels (Channel Partner, Referral Partner, Owner, Dealer, Buyer & Admin)</span>
            </span>
          </div>
          <BuyerLoginForm next={callbackUrl} />
        </div>
      )}

      {/* Tab 2: ID & Password for all panels */}
      {tab === "password" && (
        <div>
          <div className="mb-5 flex items-center gap-2 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200/70 rounded-xl px-3.5 py-2.5">
            <span>🔐</span>
            <span>Login with registered Email, Mobile Number, or Partner Code & Password</span>
          </div>
          <LoginForm callbackUrl={callbackUrl} />
        </div>
      )}

      {/* Footer Navigation */}
      <div className="mt-7 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <p>
          New Channel Partner?{" "}
          <Link href="/register" className="font-bold text-blue-600 hover:underline">
            Register Here
          </Link>
        </p>

        <span className="text-[11px] text-slate-400">
          Instant WhatsApp / Email Verification
        </span>
      </div>
    </div>
  );
}
