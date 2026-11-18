"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { requestDispatchAction, verifyDispatchPaymentAction, type DispatchFormInput } from "@/app/dispatch/actions";

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

type Purpose = "RENT" | "BUY" | "SELL" | "LETOUT";
const PURPOSES: { key: Purpose; label: string }[] = [
  { key: "RENT", label: "Rent" },
  { key: "BUY", label: "Buy" },
  { key: "SELL", label: "Sell" },
  { key: "LETOUT", label: "Let out" },
];
const RENT_BUDGETS = [
  { label: "Up to ₹10k", min: 0, max: 10000 },
  { label: "₹10k - 20k", min: 10000, max: 20000 },
  { label: "₹20k - 30k", min: 20000, max: 30000 },
  { label: "₹30k - 50k", min: 30000, max: 50000 },
  { label: "₹50k+", min: 50000, max: 500000 },
];
const SALE_BUDGETS = [
  { label: "Up to ₹50L", min: 0, max: 5000000 },
  { label: "₹50L - 80L", min: 5000000, max: 8000000 },
  { label: "₹80L - 1Cr", min: 8000000, max: 10000000 },
  { label: "₹1Cr - 2Cr", min: 10000000, max: 20000000 },
  { label: "₹2Cr+", min: 20000000, max: 100000000 },
];
const selectCls =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-ink outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100";

const Label = ({ children }: { children: string }) => (
  <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{children}</label>
);

// Customer requirement form — pure dropdowns, no typing. Captures location,
// then pays the same ₹100 as an unlock pass, then hands off to the live radar
// (RENT / SELL / LETOUT) or the company desk confirmation (BUY).
export function DispatchTrigger() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "locating" | "paying">("idle");
  const [error, setError] = useState<string | null>(null);
  const [purpose, setPurpose] = useState<Purpose>("RENT");
  const [radiusKm, setRadiusKm] = useState(3);
  const [society, setSociety] = useState("");
  const [bhk, setBhk] = useState("2");
  const [budgetIdx, setBudgetIdx] = useState(1);
  const [societies, setSocieties] = useState<string[]>([]);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const rentLike = purpose === "RENT" || purpose === "LETOUT";
  const budgets = rentLike ? RENT_BUDGETS : SALE_BUDGETS;
  const budget = budgets[Math.min(budgetIdx, budgets.length - 1)];

  function choosePurpose(next: Purpose) {
    setPurpose(next);
    setBudgetIdx(next === "RENT" || next === "LETOUT" ? 1 : 2);
  }

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => {}
    );
  }, []);

  useEffect(() => {
    if (!coords) return;
    fetch(`/api/dispatch/societies?lat=${coords.latitude}&lng=${coords.longitude}&radiusKm=${radiusKm}`)
      .then((r) => r.json())
      .then((d: string[]) => setSocieties(Array.isArray(d) ? d : []))
      .catch(() => setSocieties([]));
  }, [coords, radiusKm]);

  function handleClick() {
    if (!navigator.geolocation) {
      setError("Location isn't supported on this device.");
      return;
    }
    setStatus("locating");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const form: DispatchFormInput = {
          purpose,
          radiusKm,
          societyName: society || null,
          bhk: Number(bhk),
          budgetMin: budget.min,
          budgetMax: budget.max,
          budgetLabel: budget.label,
        };
        setStatus("paying");
        try {
          const result = await requestDispatchAction(latitude, longitude, form);
          if (!result.ok) {
            setError(result.error);
            setStatus("idle");
            return;
          }

          if (result.simulated) {
            router.push(`/dispatch/${result.dispatchRequestId}`);
            return;
          }

          await loadCheckoutScript();
          const razorpay = new window.Razorpay!({
            key: result.keyId,
            amount: result.order.amount,
            currency: result.order.currency,
            order_id: result.order.id,
            name: "Pronesto",
            description: "Property requirement",
            handler: async (response: {
              razorpay_order_id: string;
              razorpay_payment_id: string;
              razorpay_signature: string;
            }) => {
              const { dispatchRequestId } = await verifyDispatchPaymentAction({
                latitude,
                longitude,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                form,
              });
              router.push(`/dispatch/${dispatchRequestId}`);
            },
            modal: { ondismiss: () => setStatus("idle") },
          });
          razorpay.open();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
          setStatus("idle");
        }
      },
      () => {
        setError("Location access denied — we need it to find channel partners near you.");
        setStatus("idle");
      }
    );
  }

  return (
    <div className="w-full space-y-4 rounded-3xl border border-slate-200/80 bg-white p-6 text-left shadow-soft">
      <div>
        <Label>I want to</Label>
        <div className="mt-1.5 grid grid-cols-4 gap-2">
          {PURPOSES.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => choosePurpose(p.key)}
              className={`rounded-xl px-2 py-2.5 text-sm font-bold transition ${
                purpose === p.key ? "bg-ink text-white shadow" : "border border-slate-200 bg-white text-slate-600 hover:border-brand-600"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Radius</Label>
          <select value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))} className={selectCls}>
            <option value={1}>1 km</option>
            <option value={3}>3 km</option>
            <option value={5}>5 km</option>
          </select>
        </div>
        <div>
          <Label>Society</Label>
          <select value={society} onChange={(e) => setSociety(e.target.value)} className={selectCls}>
            <option value="">Any society</option>
            {societies.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Flat size</Label>
          <select value={bhk} onChange={(e) => setBhk(e.target.value)} className={selectCls}>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n} BHK
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Budget</Label>
          <select value={budgetIdx} onChange={(e) => setBudgetIdx(Number(e.target.value))} className={selectCls}>
            {budgets.map((b, i) => (
              <option key={b.label} value={i}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {purpose === "BUY" && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          BUY requirements are handled directly by our Headquarters Deal Team, who will call you with verified options.
        </p>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={status !== "idle"}
        className="w-full rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "locating" ? "Finding your location…" : status === "paying" ? "Opening payment…" : "Pay ₹100 & submit requirement"}
      </button>
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      <p className="text-[11px] text-slate-400">
        Up to 3 buzzers a day (1 hour apart) and 3 a week, within 5 km of where you first searched.
      </p>
    </div>
  );
}
