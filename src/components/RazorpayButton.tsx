"use client";

import { useState } from "react";

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
    s.onerror = () => reject(new Error("Payment checkout could not load."));
    document.body.appendChild(s);
  });
}

export type CheckoutPayload = {
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
};

export type StartResult =
  | { ok: false; error?: string }
  | {
      ok: true;
      order: { id: string; amount: number; currency: string } | null;
      keyId: string | null;
      planName?: string;
    };

/**
 * One reusable "Pay with Razorpay" button. The caller supplies two server
 * actions: `start` creates the order, `finish` verifies the payment and does the
 * work (activate plan, confirm fee ...). Nothing is trusted from the browser.
 */
export function RazorpayButton({
  start,
  finish,
  label,
  description,
  className,
  onSuccess,
}: {
  start: () => Promise<StartResult>;
  finish: (p: CheckoutPayload) => Promise<{ ok: boolean; error?: string }>;
  label: string;
  description?: string;
  className?: string;
  onSuccess?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const done = () => (onSuccess ? onSuccess() : window.location.reload());

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const o = await start();
      if (!o.ok) throw new Error("Online payment is not set up yet. Please try again later.");
      if (!o.order || !o.keyId) throw new Error("Payment is unavailable right now.");
      await loadCheckout();
      new window.Razorpay!({
        key: o.keyId,
        amount: o.order.amount,
        currency: o.order.currency,
        order_id: o.order.id,
        name: "Pronesto",
        description: description ?? o.planName,
        handler: async (resp: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const r = await finish({
            razorpayOrderId: resp.razorpay_order_id,
            razorpayPaymentId: resp.razorpay_payment_id,
            razorpaySignature: resp.razorpay_signature,
          });
          if (!r.ok) {
            setError("Payment received but activation failed - please contact support.");
            setBusy(false);
            return;
          }
          done();
        },
        modal: { ondismiss: () => setBusy(false) },
      }).open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={pay} disabled={busy} className={className}>
        {busy ? "Please wait…" : label}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
