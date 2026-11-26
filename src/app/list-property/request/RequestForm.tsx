"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Check, Crown, Loader2, MessageCircle, ShieldCheck } from "lucide-react";
import {
  sendRequestOtpAction,
  startListingRequestAction,
  verifyRequestPaymentAction,
} from "./actions";
import { SmartInput } from "@/components/forms/FormKit";
import { blinkField } from "@/lib/blinkField";

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

const PLAN_INFO = {
  BASIC: {
    name: "Basic",
    validity: "Live for 1 month",
    features: ["Listed for 30 days", "Property verified on site by a partner", "Verified badge on your listing", "Buyer enquiries on your phone"],
  },
  GOLD: {
    name: "Pro",
    validity: "Live for 3 months",
    features: ["Listed for 90 days (3 months)", "Property verified on site by a partner", "Verified badge on your listing", "Buyer enquiries on your phone", "Best value: lowest cost per month"],
  },
} as const;

export function RequestForm({
  fees,
  defaults,
  loggedIn,
}: {
  fees: Fees;
  defaults: { name?: string; phone?: string; email?: string };
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<"BASIC" | "GOLD">("BASIC");
  const [purpose, setPurpose] = useState<"RENT" | "SELL">("RENT");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState(loggedIn); // true once the owner is signed in (no OTP/password needed)
  const [phone, setPhone] = useState(defaults.phone ?? "");
  const [otpSent, setOtpSent] = useState(false);
  const [otpBusy, setOtpBusy] = useState(false);
  const [fieldError, setFieldError] = useState<{ name: "ownerPhone" | "otp"; text: string } | null>(null);

  // A wrong phone number / code is shown on that input (red, blinking), not in a banner at the top.
  function failField(name: "ownerPhone" | "otp", text: string) {
    setFieldError({ name, text });
    setTimeout(() => blinkField(document.querySelector<HTMLElement>(`[name="${name}"]`)), 0);
  }

  async function sendOtp() {
    setError(null);
    setFieldError(null);
    if (phone.replace(/\D/g, "").length < 10) return failField("ownerPhone", "Enter your 10-digit mobile number.");
    setOtpBusy(true);
    try {
      await sendRequestOtpAction(phone);
      setOtpSent(true);
    } catch (err) {
      failField("ownerPhone", err instanceof Error ? err.message : "Couldn't send the OTP.");
    } finally {
      setOtpBusy(false);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFieldError(null);
    const d = new FormData(event.currentTarget);

    try {
      const result = await startListingRequestAction({
        ownerName: String(d.get("ownerName") ?? ""),
        ownerPhone: phone,
        ownerEmail: String(d.get("ownerEmail") ?? ""),
        password: String(d.get("password") ?? ""),
        otp: String(d.get("otp") ?? ""),
        city: String(d.get("city") ?? ""),
        locality: String(d.get("locality") ?? ""),
        plan,
        purpose,
        referredByAgentCode: String(d.get("referredByAgentCode") ?? ""),
      });
      if (!result.ok) {
        if (result.registered) setAccount(true); // account exists and is signed in: just try paying again
        throw new Error(result.error);
      }
      setAccount(true);

      await loadCheckoutScript();
      new window.Razorpay!({
        key: result.keyId,
        amount: result.order.amount,
        currency: result.order.currency,
        order_id: result.order.id,
        name: "Pronesto",
        description: `${PLAN_INFO[plan].name} listing plan`,
        handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const paid = await verifyRequestPaymentAction(result.requestId, result.statusToken, r.razorpay_order_id, r.razorpay_payment_id, r.razorpay_signature);
            // Payment done: land on the request page. Add property details and the manual buzzer both live there.
            router.push(`/list-property/request/${result.requestId}?k=${result.statusToken}`);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Payment verification failed.");
            setBusy(false);
          }
        },
        modal: { ondismiss: () => setBusy(false) },
      }).open();
    } catch (err) {
      const text = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      if (/otp|code/i.test(text)) failField("otp", text);
      else if (/mobile|phone|number/i.test(text)) failField("ownerPhone", text);
      else setError(text);
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
              <p className="mt-0.5 text-xs text-slate-500">{x === "RENT" ? "A nearby partner verifies it" : "Handled by our team directly"}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">2 · Choose a plan</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {(["BASIC", "GOLD"] as const).map((p) => {
            const active = plan === p;
            const info = PLAN_INFO[p];
            return (
              <button
                type="button"
                key={p}
                onClick={() => setPlan(p)}
                aria-pressed={active}
                className={`relative cursor-pointer rounded-2xl border-2 p-4 text-left transition ${
                  active ? "border-brand-600 bg-brand-50 shadow-soft" : "border-slate-200 bg-white hover:border-brand-300"
                }`}
              >
                {p === "GOLD" && (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-gold-400 px-2 py-0.5 text-[10px] font-black text-ink">
                    <Crown className="h-3 w-3" /> BEST VALUE
                  </span>
                )}
                <p className="text-sm font-bold text-ink">{info.name}</p>
                <p className="font-display mt-1 text-3xl font-semibold text-ink">₹{fees[p].fee.toLocaleString("en-IN")}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{info.validity}</p>
                <ul className="mt-3 space-y-1.5">
                  {info.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-slate-600">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" /> {f}
                    </li>
                  ))}
                </ul>
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
          <div className="text-sm font-semibold text-slate-700">
            <label>
              Mobile number (WhatsApp)
              <SmartInput kind="mobile"
                name="ownerPhone"
                required
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                readOnly={account}
                className={input}
                placeholder="10-digit number"
              />
            </label>
            {fieldError?.name === "ownerPhone" && <p className="mt-1.5 text-xs font-semibold text-red-600">{fieldError.text}</p>}
            {!account && (
              <button
                type="button"
                onClick={sendOtp}
                disabled={otpBusy}
                className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {otpBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
                {otpSent ? "Resend WhatsApp OTP" : "Send WhatsApp OTP"}
              </button>
            )}
          </div>
          {!account && (
            <>
              <label className="text-sm font-semibold text-slate-700">
                WhatsApp OTP
                <input name="otp" required inputMode="numeric" maxLength={6} className={input} placeholder={otpSent ? "6-digit OTP" : "Send the OTP first"} onChange={(e) => e.currentTarget.classList.remove("field-error")} />
                {fieldError?.name === "otp" && <span className="mt-1.5 block text-xs font-semibold text-red-600">{fieldError.text}</span>}
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Email
                <input name="ownerEmail" type="email" required defaultValue={defaults.email} className={input} />
              </label>
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                Create a password
                <input name="password" type="password" required minLength={8} autoComplete="new-password" className={input} placeholder="At least 8 characters" />
              </label>
            </>
          )}
          <label className="text-sm font-semibold text-slate-700">
            City
            <input name="city" required className={input} placeholder="e.g. Noida" />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Area / locality
            <input name="locality" className={input} placeholder="e.g. Sector 62" />
          </label>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
            Partner code (optional)
            <input name="referredByAgentCode" className={input} placeholder="If a partner told you about us" />
          </label>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        <p className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          {purpose === "RENT"
            ? "After payment you add your property details (keep your location ON). A verified partner within 5 km is alerted, visits your property within 48 hours and verifies it with your OTP. Then your listing goes live."
            : "Sell requests are handled directly by our team. After payment our team calls you and takes your property details and documents. Your request is not shared with any channel partner."}
        </p>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="shine inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-4 text-base font-bold text-white shadow-lg shadow-brand-600/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <BadgeCheck className="h-5 w-5" />}
        {busy ? "Please wait…" : `Verify & pay ₹${price.toLocaleString("en-IN")}`}
      </button>
    </form>
  );
}
