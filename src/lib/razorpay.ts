import { createHmac, timingSafeEqual } from "crypto";

// Plain REST calls against the Razorpay API (same pattern as src/lib/whatsapp.ts —
// no SDK dependency). Not configured until RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET are
// set in .env; every caller must check isRazorpayConfigured() first and fall back
// to the existing simulated/admin-confirmed flow when it's false.
const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export function isRazorpayConfigured() {
  return Boolean(KEY_ID && KEY_SECRET);
}

// Client-side Checkout needs the (publishable) key ID even though it never
// sees the secret — safe to expose via a Server Action/route response.
export function getRazorpayKeyId() {
  return KEY_ID ?? null;
}

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  receipt: string | null;
};

// amountRupees is whole rupees (matches the Int-rupee convention already used
// across Deal/PropertyUnlock/etc.) — Razorpay's API wants paise.
export async function createRazorpayOrder(
  amountRupees: number,
  receipt: string
): Promise<RazorpayOrder | null> {
  if (!isRazorpayConfigured()) return null;

  try {
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(amountRupees * 100),
        currency: "INR",
        receipt,
      }),
    });
    if (!response.ok) return null;
    const order = await response.json();
    return { id: order.id, amount: order.amount, currency: order.currency, receipt: order.receipt ?? null };
  } catch {
    return null;
  }
}

// Standard Razorpay Checkout signature check: HMAC-SHA256(order_id + "|" +
// payment_id) using the key secret, compared to the signature Checkout
// returned client-side. Never trust a "payment succeeded" claim from the
// browser without this — it's the only proof the payment is real.
export function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
) {
  if (!isRazorpayConfigured() || !KEY_SECRET) return false;

  const expected = createHmac("sha256", KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const signatureBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual(expectedBuf, signatureBuf);
}
