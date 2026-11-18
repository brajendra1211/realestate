"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { acceptTermsAction } from "@/app/terms/actions";

const SKIP = ["/terms", "/privacy-policy", "/login", "/register", "/buyer/login", "/buyer/verify"];

// Shown once to every logged-in Agent / Customer / Investor / Owner until they
// accept the Terms & Conditions. Rendered from the root layout.
export function TermsGate() {
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (done || SKIP.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="font-display text-2xl font-semibold text-ink">Terms &amp; Conditions</h2>
        <p className="mt-2 text-sm text-slate-600">
          To keep using Pronesto as an agent, customer or investor, please read and accept our{" "}
          <Link href="/terms" target="_blank" className="font-semibold text-brand-700 underline">
            Terms &amp; Conditions
          </Link>{" "}
          and{" "}
          <Link href="/privacy-policy" target="_blank" className="font-semibold text-brand-700 underline">
            Privacy Policy
          </Link>
          .
        </p>
        <label className="mt-4 flex items-start gap-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-brand-600"
          />
          I have read and accept the Terms &amp; Conditions.
        </label>
        <button
          type="button"
          disabled={!checked || pending}
          onClick={() =>
            start(async () => {
              await acceptTermsAction();
              setDone(true);
            })
          }
          className="mt-5 w-full rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Saving…" : "Accept & continue"}
        </button>
      </div>
    </div>
  );
}
