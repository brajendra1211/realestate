"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestDispatchAction, verifyDispatchPaymentAction } from "@/app/dispatch/actions";

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

// §3.5's trigger: "customer pays ₹100 → GPS lat/long captured → radius scan".
// Captures location first (browser geolocation, same pattern as
// NearMeButton), then pays exactly like UnlockButton does, then hands off to
// the live radar page.
export function DispatchTrigger() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "locating" | "paying">("idle");
  const [error, setError] = useState<string | null>(null);

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
        setStatus("paying");
        try {
          const result = await requestDispatchAction(latitude, longitude);

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
            name: "BayaEstate",
            description: "Find a nearby agent",
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
        setError("Location access denied — we need it to find agents near you.");
        setStatus("idle");
      }
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={status !== "idle"}
        className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "locating"
          ? "Finding your location…"
          : status === "paying"
            ? "Opening payment…"
            : "Pay ₹100 & find a nearby agent"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
