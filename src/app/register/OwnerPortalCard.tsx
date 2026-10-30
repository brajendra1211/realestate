"use client";

import { useState } from "react";
import Link from "next/link";
import { RegisterForm } from "./RegisterForm";
import { LoginForm } from "../login/LoginForm";
import { BuyerLoginForm } from "../buyer/login/BuyerLoginForm";

export function OwnerPortalCard() {
  const [tab, setTab] = useState<"register" | "login">("register");
  const [loginMode, setLoginMode] = useState<"password" | "otp">("password");

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-9 shadow-xl shadow-slate-900/5">
      {/* 2 Tabs: Post Property (New Owner) vs Existing Owner Login */}
      <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 p-1.5 border border-slate-200/70 mb-6">
        <button
          type="button"
          onClick={() => setTab("register")}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-black transition-all cursor-pointer ${
            tab === "register"
              ? "bg-white text-blue-700 shadow-sm border border-slate-200/80"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <span>📝</span>
          <span>Post Property</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("login")}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-black transition-all cursor-pointer ${
            tab === "login"
              ? "bg-white text-slate-900 shadow-sm border border-slate-200/80"
              : "text-slate-500 hover:text-slate-900"
          }`}
        >
          <span>🔑</span>
          <span>Owner Log In</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: POST PROPERTY (NEW OWNER REGISTRATION)
          ========================================================================= */}
      {tab === "register" && (
        <div className="space-y-4 animate-fadeIn">
          <div className="rounded-2xl bg-blue-50/80 border border-blue-200/70 p-3.5 text-xs text-blue-900">
            <div className="flex items-center gap-2 font-black text-blue-950 mb-0.5">
              <span>🏠</span>
              <span>Owner Registration • Direct Verified Property Listing</span>
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
              Apni property direct list karein. Zero brokerage fees aur verified buyers ke direct phone & WhatsApp calls receive karein.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <span className="flex items-center gap-1 text-emerald-700">✓ Zero Brokerage</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-blue-700">✓ Verified Listing</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-700">✓ Direct Buyer Connect</span>
          </div>

          <RegisterForm accountType="OWNER" />
        </div>
      )}

      {/* =========================================================================
          TAB 2: OWNER LOGIN (EXISTING OWNERS)
          ========================================================================= */}
      {tab === "login" && (
        <div className="space-y-4 animate-fadeIn">
          <div className="rounded-2xl bg-slate-900 text-white p-3.5 text-xs">
            <div className="flex items-center gap-2 font-black mb-0.5">
              <span>🔑</span>
              <span>Existing Property Owner Sign In</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
              Already have an account? Log in below to post new properties or manage your existing listings.
            </p>
          </div>

          {/* Sub-toggle: Password vs OTP */}
          <div className="flex items-center justify-end gap-2 text-xs font-bold">
            <span className="text-slate-400 text-[11px]">Sign in with:</span>
            <button
              type="button"
              onClick={() => setLoginMode("password")}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-xs ${
                loginMode === "password"
                  ? "bg-slate-900 text-white font-black"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Password
            </button>
            <button
              type="button"
              onClick={() => setLoginMode("otp")}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-xs ${
                loginMode === "otp"
                  ? "bg-blue-700 text-white font-black"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Mobile OTP
            </button>
          </div>

          {loginMode === "password" ? (
            <LoginForm callbackUrl="/dashboard/properties/new" />
          ) : (
            <BuyerLoginForm next="/dashboard/properties/new" />
          )}
        </div>
      )}

      {/* Footer Navigation: Link to Buyer / Agent Login */}
      <div className="mt-7 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-500">
        <p>
          Looking to buy property or are you an Agent?{" "}
          <Link href="/login" className="font-extrabold text-blue-600 hover:underline">
            Buyer & Agent Login ➔
          </Link>
        </p>

        <span className="text-[11px] text-slate-400 font-semibold">
          100% Verified Owners
        </span>
      </div>
    </div>
  );
}
