"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Users, UserRound, Handshake, ShieldCheck, TrendingUp, Building2 } from "lucide-react";
import { LoginForm } from "./LoginForm";
import { OtpLoginForm } from "./OtpLoginForm";

type LoginRole = "buyer" | "owner" | "agent" | "investor" | "admin";
type Method = "otp" | "password";

const ROLES: { key: LoginRole; label: string; icon: typeof Users; db: string }[] = [
  { key: "buyer", label: "Buyer", icon: UserRound, db: "BUYER" },
  { key: "owner", label: "Owner", icon: Building2, db: "OWNER" },
  { key: "agent", label: "Channel partner", icon: Handshake, db: "AGENT" },
  { key: "investor", label: "Referral partner", icon: TrendingUp, db: "INVESTOR" },
  { key: "admin", label: "Admin", icon: ShieldCheck, db: "ADMIN" },
];

const HELP: Record<LoginRole, string> = {
  buyer: "Buyers: sign in with a one-time code on WhatsApp, or with your password if you have set one.",
  owner: "Property owners: sign in with a one-time code on WhatsApp, or with the email and password you chose when listing.",
  agent: "Channel partners: sign in with a one-time code, or with your email / partner code and password.",
  investor:
    "Referral partners: use the mobile number or email your channel partner registered you with, with a one-time code or your password.",
  admin: "Admin and team members: sign in with your email and password.",
};

export function UnifiedLoginCard({
  callbackUrl,
  initialRole = "buyer",
}: {
  callbackUrl: string;
  initialRole?: LoginRole;
}) {
  const [role, setRole] = useState<LoginRole>(initialRole);
  const [method, setMethod] = useState<Method>(initialRole === "agent" || initialRole === "admin" ? "password" : "otp");
  const current = ROLES.find((r) => r.key === role)!;
  const otpAllowed = role !== "admin";
  const effective: Method = otpAllowed ? method : "password";

  return (
    <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">I am a</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {ROLES.map((r, i) => {
          const active = role === r.key;
          const Icon = r.icon;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => setRole(r.key)}
              aria-pressed={active}
              className={`flex cursor-pointer items-center gap-2.5 rounded-2xl border-2 px-3 py-2.5 text-left transition ${
                i === ROLES.length - 1 ? "col-span-2" : ""
              } ${active ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white hover:border-brand-300"}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                  active ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="block truncate text-[13px] font-bold text-ink">{r.label}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-600">{HELP[role]}</p>

      {otpAllowed && (
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Sign-in method">
          {(["otp", "password"] as Method[]).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={effective === m}
              onClick={() => setMethod(m)}
              className={`cursor-pointer rounded-lg py-2 text-xs font-bold transition ${
                effective === m ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {m === "otp" ? "OTP on WhatsApp" : "ID & password"}
            </button>
          ))}
        </div>
      )}

      <div className="mt-2">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${role}-${effective}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {effective === "otp" ? (
              <OtpLoginForm role={current.db} callbackUrl={callbackUrl} />
            ) : (
              <LoginForm callbackUrl={callbackUrl} expectedRole={current.db} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {role === "buyer" && (
        <p className="mt-4 text-center text-xs text-slate-500">
          New here? Just enter your mobile number. Your buyer account is created automatically after the one-time code.
        </p>
      )}

      {role === "owner" && (
        <p className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
          New owner?{" "}
          <Link href="/list-property/request" className="font-bold text-brand-600 hover:underline">
            List a property →
          </Link>
        </p>
      )}

      {role === "agent" && (
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
      )}

      {role === "investor" && (
        <p className="mt-4 text-center text-xs text-slate-500">
          Not registered yet? Ask your channel partner to add you as a referral partner.
        </p>
      )}
    </div>
  );
}
