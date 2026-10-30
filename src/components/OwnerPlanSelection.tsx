"use client";

import { useState } from "react";
import { chooseOwnerPlanAction } from "@/app/dashboard/actions";

interface OwnerPlanSelectionProps {
  basicFee: number;
  goldFee: number;
  userRole?: string;
}

export function OwnerPlanSelection({
  basicFee,
  goldFee,
}: OwnerPlanSelectionProps) {
  const [loadingTier, setLoadingTier] = useState<"BASIC" | "GOLD" | null>(null);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
      <div className="text-center sm:text-left">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200">
          <span>🔒</span> Paid Listing Plans Only
        </span>
        <h2 className="mt-3 text-2xl font-black text-slate-900 tracking-tight">
          Choose a Plan to List Your Property
        </h2>
        <p className="mt-1.5 text-sm text-slate-600 max-w-xl">
          To maintain verified, high-quality inventory on BayaEstate, free listings are disabled. Select an owner listing plan below to publish your property:
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Basic Plan */}
        <div className="relative flex flex-col justify-between rounded-2xl border-2 border-slate-200 bg-slate-50/50 p-6 transition hover:border-slate-300 hover:shadow-md">
          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-lg bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 uppercase tracking-wider">
                Basic Plan
              </span>
              <span className="text-xs font-semibold text-slate-500">1 Month</span>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900">₹{basicFee.toLocaleString("en-IN")}</span>
                <span className="text-sm font-semibold text-slate-500">/ 1 month</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">Valid for 30 days active listing</p>
            </div>

            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">✓</span>
                <span><strong>1 Verified</strong> Property Listing</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">✓</span>
                <span><strong>30 Days</strong> public live visibility</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">✓</span>
                <span>Verified Direct Owner badge</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">✓</span>
                <span>Direct customer calls &amp; inquiries</span>
              </li>
            </ul>
          </div>

          <form
            action={chooseOwnerPlanAction}
            onSubmit={() => setLoadingTier("BASIC")}
            className="mt-8"
          >
            <input type="hidden" name="planTier" value="BASIC" />
            <button
              type="submit"
              disabled={loadingTier !== null}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60 cursor-pointer shadow-sm"
            >
              {loadingTier === "BASIC" ? "Activating Plan..." : `Select 1 Month Plan (₹${basicFee})`}
            </button>
          </form>
        </div>

        {/* Gold Plan */}
        <div className="relative flex flex-col justify-between rounded-2xl border-2 border-amber-400 bg-amber-50/40 p-6 transition hover:border-amber-500 hover:shadow-lg">
          <div className="absolute -top-3.5 right-6 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-xs">
            ★ Best Value · 3 Months
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="rounded-lg bg-amber-200 px-2.5 py-1 text-xs font-bold text-amber-900 uppercase tracking-wider">
                Gold Plan
              </span>
              <span className="text-xs font-semibold text-amber-800">3 Months</span>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900">₹{goldFee.toLocaleString("en-IN")}</span>
                <span className="text-sm font-semibold text-slate-500">/ 3 months</span>
              </div>
              <p className="mt-1 text-xs text-amber-800 font-medium">Valid for 90 days active listing (Save ₹100!)</p>
            </div>

            <ul className="mt-6 space-y-3 text-sm text-slate-800">
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">✓</span>
                <span><strong>90 Days (3 Months)</strong> extended visibility</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">✓</span>
                <span><strong>Up to 3 listings</strong> capacity</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">✓</span>
                <span><strong>Gold Priority</strong> ranking in search</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">✓</span>
                <span><strong>Auto-broadcast</strong> to nearby verified channel partners</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">✓</span>
                <span>Priority customer support</span>
              </li>
            </ul>
          </div>

          <form
            action={chooseOwnerPlanAction}
            onSubmit={() => setLoadingTier("GOLD")}
            className="mt-8"
          >
            <input type="hidden" name="planTier" value="GOLD" />
            <button
              type="submit"
              disabled={loadingTier !== null}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-sm font-bold text-white transition hover:from-amber-600 hover:to-amber-700 disabled:opacity-60 cursor-pointer shadow-md"
            >
              {loadingTier === "GOLD" ? "Activating Plan..." : `Select 3 Months Plan (₹${goldFee})`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
