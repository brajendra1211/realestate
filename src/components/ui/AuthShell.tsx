"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ShieldCheck, Handshake, KeyRound } from "lucide-react";

const POINTS = [
  { icon: <Handshake className="h-5 w-5" />, text: "Zero-brokerage rentals, straight from owners" },
  { icon: <ShieldCheck className="h-5 w-5" />, text: "Every home for sale is verified by our team" },
  { icon: <KeyRound className="h-5 w-5" />, text: "One secure sign-in for every kind of user" },
];

const EASE = [0.22, 1, 0.36, 1] as const;

/** Split-screen shell shared by login & register. Left: brand story. Right: the form. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100vh-68px)] lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-brand-950 text-white lg:block">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&auto=format&fit=crop&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-950 via-brand-950/90 to-brand-900/80" />
        <div className="absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]" />
        <div className="absolute -left-20 top-1/3 h-80 w-80 rounded-full bg-brand-500/30 blur-[110px] animate-blob" />
        <div className="absolute -bottom-20 right-0 h-80 w-80 rounded-full bg-gold-400/20 blur-[110px] animate-blob animation-delay-4000" />

        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <Link href="/" className="font-display text-3xl font-semibold">
            pronesto<span className="text-gold-400">.</span>
          </Link>

          <div>
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE }}
              className="font-display max-w-md text-5xl font-semibold leading-[1.08]"
            >
              Your next move starts <span className="text-gradient-gold italic">here.</span>
            </motion.h2>
            <ul className="mt-10 space-y-4">
              {POINTS.map((p, i) => (
                <motion.li
                  key={p.text}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 + i * 0.12, ease: EASE }}
                  className="flex items-center gap-3.5 text-slate-200"
                >
                  <span className="glass-dark flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 text-gold-300">
                    {p.icon}
                  </span>
                  {p.text}
                </motion.li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-slate-400">Verified listings · Direct buyer connect · Secure documents</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-gradient-to-b from-slate-50 to-white px-4 py-12 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
          className="w-full max-w-md"
        >
          <Link href="/" className="font-display mb-6 block text-center text-3xl font-semibold text-brand-900 lg:hidden">
            pronesto<span className="text-gold-500">.</span>
          </Link>
          <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}
