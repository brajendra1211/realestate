"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Users, UserRound, Handshake, ShieldCheck, TrendingUp } from "lucide-react";
import { LoginForm } from "./LoginForm";
import { BuyerLoginForm } from "../buyer/login/BuyerLoginForm";
import { InvestorLoginForm } from "../investor/login/InvestorLoginForm";

type LoginRole = "buyer" | "agent" | "investor" | "admin";

const ROLES: { key: LoginRole; label: string; sub: string; icon: typeof Users }[] = [
  { key: "buyer", label: "Buyer / Owner", sub: "OTP on WhatsApp", icon: UserRound },
  { key: "agent", label: "Channel partner", sub: "Password", icon: Handshake },
  { key: "investor", label: "Referral partner", sub: "OTP on WhatsApp", icon: TrendingUp },
  { key: "admin", label: "Admin", sub: "Password", icon: ShieldCheck },
];

const HELP: Record<LoginRole, string> = {
  buyer: "Buyers and property owners: enter your mobile number or email and we will send a one-time code.",
  agent: "Channel partners: sign in with the email and password you registered with.",
  investor:
    "Referral partners: use the mobile number or email your channel partner registered you with. We will send a one-time code on WhatsApp or email.",
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
  const hasExplicitTarget = callbackUrl !== "/";

  return (
    <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-soft sm:p-8">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">I am a</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {ROLES.map((r) => {
          const active = role === r.key;
          const Icon = r.icon;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => setRole(r.key)}
              aria-pressed={active}
              className={`flex cursor-pointer items-center gap-2.5 rounded-2xl border-2 px-3 py-2.5 text-left transition ${
                active ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white hover:border-brand-300"
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                  active ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-bold text-ink">{r.label}</span>
                <span className="block truncate text-[11px] text-slate-500">{r.sub}</span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-600">{HELP[role]}</p>

      <div className="mt-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={role}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {role === "buyer" && (
              <>
                <BuyerLoginForm next={hasExplicitTarget ? callbackUrl : undefined} />
                <p className="text-center text-xs font-medium text-slate-400">
                  Zero spam · Instant WhatsApp OTP verification
                </p>
              </>
            )}
            {(role === "agent" || role === "admin") && <LoginForm callbackUrl={callbackUrl} />}
            {role === "investor" && <InvestorLoginForm />}
          </motion.div>
        </AnimatePresence>
      </div>

      {role === "buyer" && (
        <>
          <p className="mt-4 text-center text-xs text-slate-500">
            New here? Just enter your mobile number. Your account is created automatically after the one-time code.
          </p>
          <p className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
            Property owner?{" "}
            <Link href="/register" className="font-bold text-brand-600 hover:underline">
              List a property →
            </Link>
          </p>
        </>
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
