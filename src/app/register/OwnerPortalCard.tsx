"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { FilePlus2, KeyRound, Home, Check, ArrowRight } from "lucide-react";
import { RegisterForm } from "./RegisterForm";
import { LoginForm } from "../login/LoginForm";
import { BuyerLoginForm } from "../buyer/login/BuyerLoginForm";

export function OwnerPortalCard() {
  const [tab, setTab] = useState<"register" | "login">("register");
  const [loginMode, setLoginMode] = useState<"password" | "otp">("password");

  const tabs = [
    { id: "register" as const, label: "Post property", icon: <FilePlus2 className="h-4 w-4" /> },
    { id: "login" as const, label: "Owner log in", icon: <KeyRound className="h-4 w-4" /> },
  ];

  return (
    <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8">
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`relative flex cursor-pointer items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
              tab === t.id ? "text-white" : "text-slate-600 hover:text-ink"
            }`}
          >
            {tab === t.id && (
              <motion.span
                layoutId="owner-tab"
                className="absolute inset-0 rounded-xl bg-brand-600 shadow-md"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative flex items-center gap-2">
              {t.icon}
              {t.label}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {tab === "register" ? (
          <motion.div
            key="register"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
            className="space-y-4"
          >
            <div className="flex items-start gap-3 rounded-2xl bg-brand-50 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
                <Home className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-ink">Owner registration</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                  List your property directly. Zero brokerage fees, and verified buyers call or WhatsApp you
                  directly.
                </p>
              </div>
            </div>

            <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold text-slate-600">
              {["Zero brokerage", "Verified listing", "Direct buyer connect"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-600" /> {t}
                </li>
              ))}
            </ul>

            <RegisterForm accountType="OWNER" />
          </motion.div>
        ) : (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
            className="space-y-4"
          >
            <div className="rounded-2xl bg-ink p-4 text-white">
              <p className="text-sm font-bold">Existing property owner</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-300">
                Log in to post new properties or manage your listings.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 text-xs font-semibold">
              <span className="text-slate-400">Sign in with</span>
              {(["password", "otp"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setLoginMode(m)}
                  className={`cursor-pointer rounded-full px-3 py-1.5 transition ${
                    loginMode === m ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {m === "password" ? "Password" : "Mobile OTP"}
                </button>
              ))}
            </div>

            {loginMode === "password" ? (
              <LoginForm callbackUrl="/list-property/request" />
            ) : (
              <BuyerLoginForm next="/list-property/request" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
        Looking to buy, or are you an agent?{" "}
        <Link href="/login" className="inline-flex items-center gap-1 font-bold text-brand-600 hover:underline">
          Buyer &amp; agent login <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </p>
    </div>
  );
}
