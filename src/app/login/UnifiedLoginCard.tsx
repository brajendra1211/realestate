"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles, ArrowRight, ArrowLeft, Users } from "lucide-react";
import { LoginForm } from "./LoginForm";
import { BuyerLoginForm } from "../buyer/login/BuyerLoginForm";

export function UnifiedLoginCard({ callbackUrl }: { callbackUrl: string }) {
  const [usePassword, setUsePassword] = useState(false);
  const hasExplicitTarget = callbackUrl !== "/";

  const linkBtn =
    "inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-brand-700";

  return (
    <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8">
      <div className="mb-6 flex items-start gap-3 rounded-2xl bg-brand-50 p-4 text-sm">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <p className="font-bold text-ink">One sign-in for everyone</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
            Buyer, channel partner or referral partner — enter your number or email and we&apos;ll take you
            straight to your own dashboard.
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {!usePassword ? (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <BuyerLoginForm next={hasExplicitTarget ? callbackUrl : undefined} />
            <p className="text-center text-xs font-medium text-slate-400">
              Zero spam · Instant WhatsApp OTP verification
            </p>
            <div className="text-center">
              <button type="button" onClick={() => setUsePassword(true)} className={linkBtn}>
                Channel partner or admin? Use a password instead
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="pw"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <LoginForm callbackUrl={callbackUrl} />
            <div className="text-center">
              <button type="button" onClick={() => setUsePassword(false)} className={linkBtn}>
                <ArrowLeft className="h-4 w-4" /> Back to OTP sign-in
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-7 flex flex-col gap-3 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Users className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
          <div>
            <p className="text-sm font-bold text-emerald-950">New channel partner?</p>
            <p className="text-xs text-emerald-800">Earn a commission split and get exclusive QR badges.</p>
          </div>
        </div>
        <Link
          href="/register/agent"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-800"
        >
          Register <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <p className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
        Property owner?{" "}
        <Link href="/register" className="font-bold text-brand-600 hover:underline">
          List a property →
        </Link>
      </p>
    </div>
  );
}
