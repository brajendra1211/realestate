"use client";

import { useState } from "react";
import { convertPlanAction } from "@/app/agent/dashboard/actions";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" });

export function PlanConvertCard({
  toPlanId,
  fromPlanName,
  toPlanName,
  remainingDays,
  remainingValue,
  newDays,
  newEndDate,
}: {
  toPlanId: string;
  fromPlanName: string;
  toPlanName: string;
  remainingDays: number;
  remainingValue: number;
  newDays: number;
  newEndDate: string; // ISO
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (!window.confirm(`Switch now? Your ${remainingDays} remaining days become ${newDays} days of Prime. This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    const r = await convertPlanAction(toPlanId);
    if (!r.ok) {
      setError("Could not switch your plan. Please try again.");
      setBusy(false);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
      <p className="text-sm font-bold text-violet-900">Upgrade to Prime with your remaining days — no payment</p>
      <p className="mt-1 text-xs leading-relaxed text-violet-900/80">
        You still have <b>{remainingDays} days</b> left on your plan (worth <b>{inr(remainingValue)}</b>). Prime costs more per
        day, so that value becomes about <b>{newDays} days of Prime</b>, valid till {dateLabel(newEndDate)}. You start getting
        Prime benefits immediately.
      </p>
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className="mt-3 w-full cursor-pointer rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-60"
      >
        {busy ? "Switching…" : `Switch to ${toPlanName.replace("Channel Partner ", "")} now`}
      </button>
      <p className="mt-2 text-[11px] text-violet-900/60">
        From: {fromPlanName.replace("Channel Partner ", "")}. Prefer more days instead? Pay for a new plan below.
      </p>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
