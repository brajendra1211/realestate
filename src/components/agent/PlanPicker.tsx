"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type PickerPlan = {
  id: string;
  name: string;
  tier: "BASIC" | "PRIME";
  price: number;
  durationDays: number;
  months: number;
  listingLimit: number;
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const periodLabel = (months: number) => `${months} ${months === 1 ? "month" : "months"}`;

const TIER_COPY = {
  BASIC: {
    title: "Basic",
    blurb: "For agents getting started",
    perks: ["Up to 10 property listings", "Channel Partner Code & shop page", "Standard feed ranking"],
  },
  PRIME: {
    title: "Prime",
    blurb: "Most popular",
    perks: ["Unlimited property listings", "Priority feed ranking", "Direct buyer leads & dispatch alerts"],
  },
} as const;

/**
 * Hostinger-style plan chooser: pick a plan, then a billing period from a
 * dropdown. Longer periods show what you save versus paying monthly.
 */
export function PlanPicker({
  plans,
  value,
  onChange,
}: {
  plans: PickerPlan[];
  value: string;
  onChange: (planId: string) => void;
}) {
  const selected = plans.find((p) => p.id === value) ?? plans[plans.length - 1];
  const tier = selected?.tier ?? "PRIME";

  const tierPlans = useMemo(
    () => plans.filter((p) => p.tier === tier).sort((a, b) => a.months - b.months),
    [plans, tier]
  );
  const monthly = (t: "BASIC" | "PRIME") => plans.find((p) => p.tier === t && p.months === 1);

  const saving = (p: PickerPlan) => {
    const m = monthly(p.tier);
    if (!m || p.months === 1) return { amount: 0, percent: 0 };
    const amount = m.price * p.months - p.price;
    return { amount, percent: Math.round((amount / (m.price * p.months)) * 100) };
  };
  const bestValueId = useMemo(() => {
    let best: PickerPlan | null = null;
    let bestPct = 0;
    for (const p of tierPlans) {
      const m = plans.find((x) => x.tier === p.tier && x.months === 1);
      if (!m || p.months === 1) continue;
      const pct = (m.price * p.months - p.price) / (m.price * p.months);
      if (pct > bestPct) {
        bestPct = pct;
        best = p;
      }
    }
    return best?.id ?? null;
  }, [plans, tierPlans]);

  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (!selected) return null;

  const pickTier = (t: "BASIC" | "PRIME") => {
    if (t === tier) return;
    // Keep the same billing period when switching plan, if that plan offers it.
    const same = plans.find((p) => p.tier === t && p.months === selected.months);
    const fallback = plans.find((p) => p.tier === t && p.id === bestValueId) ?? plans.find((p) => p.tier === t);
    const next = same ?? fallback;
    if (next) onChange(next.id);
  };

  const sv = saving(selected);
  const perMonth = selected.price / selected.months;
  const fullPrice = (monthly(selected.tier)?.price ?? selected.price) * selected.months;

  return (
    <div className="space-y-5">
      {/* Plan tiers */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {(["BASIC", "PRIME"] as const).map((t) => {
          const m = monthly(t);
          if (!plans.some((p) => p.tier === t)) return null;
          const active = tier === t;
          const copy = TIER_COPY[t];
          return (
            <button
              key={t}
              type="button"
              onClick={() => pickTier(t)}
              aria-pressed={active}
              className={`relative rounded-2xl border-2 p-4 text-left transition ${
                active ? "border-brand-600 bg-brand-50 shadow-sm" : "border-slate-200 bg-white hover:border-brand-300"
              }`}
            >
              {t === "PRIME" && (
                <span className="absolute -top-2.5 right-4 rounded-full bg-violet-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
                  Most popular
                </span>
              )}
              <div className="flex items-center justify-between">
                <span className="font-display text-lg font-semibold text-ink">{copy.title}</span>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    active ? "border-brand-600 bg-brand-600" : "border-slate-300"
                  }`}
                >
                  {active && <span className="h-2 w-2 rounded-full bg-white" />}
                </span>
              </div>
              {m && (
                <p className="mt-1 text-sm text-slate-500">
                  from <span className="text-xl font-bold text-brand-700">{inr(m.price)}</span>/month
                </p>
              )}
              <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                {copy.perks.map((perk) => (
                  <li key={perk} className="flex gap-2">
                    <span className="text-emerald-600">✓</span>
                    {perk}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {/* Billing period */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <p className="text-sm font-semibold text-ink">Period</p>
        <div ref={boxRef} className="relative mt-2 max-w-xs">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={open}
            className={`flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-left text-sm font-medium text-ink transition ${
              open ? "border-brand-500 ring-4 ring-brand-100" : "border-slate-300 hover:border-brand-400"
            }`}
          >
            <span className="flex items-center gap-2">
              {periodLabel(selected.months)}
              {selected.id === bestValueId && (
                <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700">Best value</span>
              )}
            </span>
            <svg
              className={`h-4 w-4 text-slate-500 transition ${open ? "rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {open && (
            <ul
              role="listbox"
              className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-lift"
            >
              {tierPlans.map((p) => {
                const s = saving(p);
                const isSel = p.id === selected.id;
                return (
                  <li key={p.id} role="option" aria-selected={isSel}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(p.id);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-slate-100 ${
                        isSel ? "bg-slate-100 font-semibold" : ""
                      }`}
                    >
                      <span>
                        {periodLabel(p.months)}
                        <span className="ml-2 text-slate-500">{inr(p.price)}</span>
                      </span>
                      {p.id === bestValueId ? (
                        <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700">Best value</span>
                      ) : s.percent > 0 ? (
                        <span className="text-xs font-semibold text-emerald-600">Save {s.percent}%</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Price summary */}
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
          <div>
            <p className="text-xs text-slate-500">
              {TIER_COPY[tier].title} plan · {periodLabel(selected.months)}
            </p>
            <p className="mt-0.5 flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold text-ink">{inr(selected.price)}</span>
              {sv.amount > 0 && <span className="text-sm text-slate-400 line-through">{inr(fullPrice)}</span>}
            </p>
            {selected.months > 1 && (
              <p className="text-xs text-slate-500">
                that is only {inr(perMonth)}/month
              </p>
            )}
          </div>
          {sv.amount > 0 && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
              You save {inr(sv.amount)} ({sv.percent}%)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
