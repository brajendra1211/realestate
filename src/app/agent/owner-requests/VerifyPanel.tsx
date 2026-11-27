"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { sendVerifyOtpAction, verifyAndPublishAction } from "./actions";

const CHECKS = [
  "The property exists at this address and the location matches",
  "The details (type, rent, deposit, BHK, area) are correct",
  "The photos match the real property",
];

export function VerifyPanel({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [checked, setChecked] = useState<boolean[]>(CHECKS.map(() => false));
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const allChecked = checked.every(Boolean);

  function send() {
    setError(null);
    start(async () => {
      try {
        await sendVerifyOtpAction(requestId);
        setSent(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't send the OTP.");
      }
    });
  }

  function verify() {
    setError(null);
    start(async () => {
      try {
        await verifyAndPublishAction(requestId, code);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Verification failed.");
      }
    });
  }

  return (
    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-ink">
        <ShieldCheck className="h-4 w-4 text-emerald-600" /> Verify at the property
      </p>
      <ul className="mt-3 space-y-2">
        {CHECKS.map((c, i) => (
          <li key={c}>
            <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={checked[i]}
                onChange={(e) => setChecked((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))}
                className="mt-0.5 h-4 w-4 accent-emerald-600"
              />
              {c}
            </label>
          </li>
        ))}
      </ul>

      {error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}

      {!sent ? (
        <button
          type="button"
          onClick={send}
          disabled={!allChecked || pending}
          className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Send OTP to owner
        </button>
      ) : (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-slate-600">OTP sent to the owner&apos;s WhatsApp. Ask them to read it out.</p>
          <div className="flex flex-wrap gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="6-digit OTP"
              className="w-40 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold tracking-widest"
            />
            <button
              type="button"
              onClick={verify}
              disabled={code.length < 4 || pending}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Verify and publish
            </button>
            <button type="button" onClick={send} disabled={pending} className="cursor-pointer text-xs font-bold text-brand-600 hover:underline">
              Resend OTP
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
