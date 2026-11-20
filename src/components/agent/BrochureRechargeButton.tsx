"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmRechargeAction, createRechargeOrderAction } from "@/app/agent/brochures/actions";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Payment checkout load nahi hua."));
    document.body.appendChild(s);
  });
}

export function BrochureRechargeButton({ price, credits }: { price: number; credits: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const r = await createRechargeOrderAction();
      if (!r.order || !r.keyId) throw new Error("Payment abhi available nahi hai.");
      await loadCheckout();
      new window.Razorpay!({
        key: r.keyId,
        amount: r.order.amount,
        currency: r.order.currency,
        order_id: r.order.id,
        name: "Pronesto",
        description: `${credits} brochure credits`,
        handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await confirmRechargeAction({
              razorpayOrderId: resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature,
            });
            router.refresh();
          } catch {
            setError("Payment ho gayi par credits confirm nahi hue — support se baat kijiye.");
          }
          setBusy(false);
        },
        modal: { ondismiss: () => setBusy(false) },
      }).open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kuch galat hua. Dobara try kijiye.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={pay}
        disabled={busy}
        className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-60"
      >
        {busy ? "Please wait…" : `Recharge ₹${price} → ${credits} brochures`}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
