"use client";

import { useState } from "react";
import Link from "next/link";
import { LoginForm } from "./LoginForm";
import { BuyerLoginForm } from "../buyer/login/BuyerLoginForm";

export function UnifiedLoginCard({ callbackUrl }: { callbackUrl: string }) {
  const [usePassword, setUsePassword] = useState(false);
  const hasExplicitTarget = callbackUrl !== "/";

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-9 shadow-xl shadow-slate-900/5">
      <div className="rounded-2xl bg-slate-50 border border-slate-200/70 p-3.5 text-xs text-slate-700 mb-6">
        <div className="flex items-center gap-2 font-black text-slate-900 mb-0.5">
          <span>✨</span>
          <span>One sign in for everyone</span>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
          Buyer, Channel Partner, or Referral Partner — enter your number or email and
          we&apos;ll take you straight to your own dashboard.
        </p>
      </div>

      {!usePassword ? (
        <div className="space-y-4 animate-fadeIn">
          <BuyerLoginForm next={hasExplicitTarget ? callbackUrl : undefined} />

          <div className="pt-1 text-center text-[11px] text-slate-400 font-medium">
            <span>✓ Zero spam • Instant WhatsApp OTP verification</span>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setUsePassword(true)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 underline underline-offset-2 cursor-pointer"
            >
              Channel partner or admin? Sign in with a password instead
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-fadeIn">
          <LoginForm callbackUrl={callbackUrl} />

          <div className="text-center">
            <button
              type="button"
              onClick={() => setUsePassword(false)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 underline underline-offset-2 cursor-pointer"
            >
              ← Back to OTP sign in
            </button>
          </div>
        </div>
      )}

      {/* Register Callout for New Agents */}
      <div className="mt-6 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/50 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
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
