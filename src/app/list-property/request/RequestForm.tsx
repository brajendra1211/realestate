"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Crown, Loader2, ShieldCheck } from "lucide-react";
import {
  startListingRequestAction,
  verifyRequestPaymentAction,
} from "./actions";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Couldn't load payment checkout."));
    document.body.appendChild(script);
  });
}

const input =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100";

type Fees = { BASIC: { fee: number; agent: number }; GOLD: { fee: number; agent: number } };

export function RequestForm({
  fees,
  defaults,
}: {
  fees: Fees;
  defaults: { name?: string; phone?: string; email?: string };
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<"BASIC" | "GOLD">("BASIC");
  const [purpose, setPurpose] = useState<"RENT" | "SELL">("RENT");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const d = new FormData(event.currentTarget);
    const go = (id: string, token: string) => router.push(`/list-property/request/${id}?k=${token}`);

    try {
      const result = await startListingRequestAction({
        ownerName: String(d.get("ownerName") ?? ""),
        ownerPhone: String(d.get("ownerPhone") ?? ""),
        ownerEmail: String(d.get("ownerEmail") ?? ""),
        city: String(d.get("city") ?? ""),
        locality: String(d.get("locality") ?? ""),
        plan,
        purpose,
        referredByAgentCode: String(d.get("referredByAgentCode") ?? ""),
      });
      if (!result) throw new Error("Something went wrong. Please try again.");

      await loadCheckoutScript();
      new window.Razorpay!({
        key: result.keyId,
        amount: result.order.amount,
        currency: result.order.currency,
        order_id: result.order.id,
        name: "Pronesto",
        description: `${plan === "GOLD" ? "Gold" : "Basic"} listing plan`,
        handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await verifyRequestPaymentAction(result.requestId, result.statusToken, r.razorpay_order_id, r.razorpay_payment_id, r.razorpay_signature);
            go(result.requestId, result.statusToken);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Payment verification failed.");
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      }).open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  const price = fees[plan].fee;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">1 · What do you want to do?</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {(["RENT", "SELL"] as const).map((x) => (
            <button
              type="button"
              key={x}
              onClick={() => setPurpose(x)}
              aria-pressed={purpose === x}
              className={`cursor-pointer rounded-2xl border-2 px-4 py-3 text-left transition ${
                purpose === x ? "border-brand-600 bg-brand-50 shadow-soft" : "border-slate-200 bg-white hover:border-brand-300"
              }`}
            >
              <p className="text-sm font-bold text-ink">{x === "RENT" ? "Rent out my property" : "Sell my property"}</p>
              <p className="mt-0.5 text-xs text-slate-500">{x === "RENT" ? "A nearby partner helps you" : "Handled by our team directly"}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">2 · Choose a plan</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {(["BASIC", "GOLD"] as const).map((p) => {
            const active = plan === p;
            return (
              <button
                type="button"
                key={p}
                onClick={() => setPlan(p)}
                className={`relative cursor-pointer rounded-2xl border-2 p-4 text-left transition ${
                  active ? "border-brand-600 bg-brand-50 shadow-soft" : "border-slate-200 bg-white hover:border-brand-300"
                }`}
              >
                {p === "GOLD" && (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-gold-400 px-2 py-0.5 text-[10px] font-black text-ink">
                    <Crown className="h-3 w-3" /> BEST
                  </span>
                )}
                <p className="text-sm font-bold text-ink">{p === "GOLD" ? "Gold listing" : "Basic listing"}</p>
                <p className="font-display mt-1 text-3xl font-semibold text-ink">₹{fees[p].fee.toLocaleString("en-IN")}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{p === "GOLD" ? "Live for 3 months" : "Live for 1 month"}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">3 · Your details</p>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Your name
            <input name="ownerName" required defaultValue={defaults.name} className={input} placeholder="Full name" />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Mobile number
            <input name="ownerPhone" required inputMode="tel" defaultValue={defaults.phone} className={input} placeholder="10-digit number" />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            City
            <input name="city" required className={input} placeholder="e.g. Noida" />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Area / locality
            <input name="locality" className={input} placeholder="e.g. Sector 62" />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Email (optional)
            <input name="ownerEmail" type="email" defaultValue={defaults.email} className={input} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Partner code (optional)
            <input name="referredByAgentCode" className={input} placeholder="If a partner told you about us" />
          </label>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        <p className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          {purpose === "RENT"
            ? "After payment, a verified channel partner near you gets an alert, calls you and sends a link where you fill in your property details."
            : "Sell requests are handled directly by our team. After payment our team calls you and takes your property details and documents. Your request is not shared with any channel partner."}
        </p>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="shine inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-4 text-base font-bold text-white shadow-lg shadow-brand-600/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <BadgeCheck className="h-5 w-5" />}
        {busy ? "Please wait…" : purpose === "SELL" ? `Pay ₹${price.toLocaleString("en-IN")} & send to our team` : `Pay ₹${price.toLocaleString("en-IN")} & find a partner`}
      </button>
    </form>
  );
}
