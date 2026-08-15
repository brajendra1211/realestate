"use client";

import { useState } from "react";
import { createUnlockOrderAction, verifyUnlockPaymentAction } from "@/app/listings/[slug]/actions";

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

// Only rendered when Razorpay is configured (src/app/listings/[slug]/page.tsx
// checks isRazorpayConfigured() and falls back to the plain simulated form
// otherwise, unchanged from before this component existed).
export function UnlockButton({ agentListingId, slug }: { agentListingId: string; slug: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      const result = await createUnlockOrderAction(agentListingId, slug);

      if (result.alreadyUnlocked) {
        window.location.href = `/listings/${slug}?unlocked=1`;
        return;
      }
      if (!result.order || !result.keyId) {
        throw new Error("Payment isn't available right now. Please try again shortly.");
      }

      await loadCheckoutScript();
      const order = result.order;
      const keyId = result.keyId;

      const razorpay = new window.Razorpay!({
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.id,
        name: "BayaEstate",
        description: "Unlock property contact & address",
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await verifyUnlockPaymentAction({
              agentListingId,
              slug,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
          } catch {
            setError("Payment succeeded but unlock failed to confirm — contact support.");
            setLoading(false);
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      });
      razorpay.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Opening payment…" : "Pay ₹100 & Unlock"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
