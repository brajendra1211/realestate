import { createHmac, timingSafeEqual } from "crypto";

// Plain REST calls against the Razorpay API (same pattern as src/lib/whatsapp.ts —
// no SDK dependency). Not configured until RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET are
// set in .env. Without them no payment can be taken: every flow reports "payment
// unavailable" and nothing is granted. There is deliberately no simulated mode.
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
  // The full reference we asked for (Razorpay's own receipt field is capped at
  // 40 characters, so the real value travels in `notes.ref`).
  receipt: string | null;
};

// Razorpay rejects receipts over 40 chars, and our references (ids + purpose)
// are longer. Send a short receipt and keep the full reference in notes.
function shortReceipt() {
  return `rcpt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.slice(0, 40);
}

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
        receipt: shortReceipt(),
        notes: { ref: receipt.slice(0, 250) },
      }),
    });
    if (!response.ok) {
      console.error("Razorpay order creation failed", response.status, await response.text().catch(() => ""));
      return null;
    }
    const order = await response.json();
    return { id: order.id, amount: order.amount, currency: order.currency, receipt: order.notes?.ref ?? order.receipt ?? null };
  } catch (error) {
    console.error("Razorpay order creation failed", error);
    return null;
  }
}

// Server-side lookup of an order, used to confirm what a payment was actually
// for (amount + receipt) so a payment made for one purpose can't be replayed
// for another.
export async function fetchRazorpayOrder(orderId: string): Promise<RazorpayOrder | null> {
  if (!isRazorpayConfigured()) return null;
  try {
    const response = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64")}` },
    });
    if (!response.ok) return null;
    const order = await response.json();
    return { id: order.id, amount: order.amount, currency: order.currency, receipt: order.notes?.ref ?? order.receipt ?? null };
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

/**
 * The one check every purchase confirmation should go through: the signature
 * is genuine, and the order really was for this buyer (receipt prefix) and this
 * amount. Stops a payment made for one thing being replayed for another.
 */
export async function verifyPaidOrder(p: {
  orderId?: string | null;
  paymentId?: string | null;
  signature?: string | null;
  amountRupees: number;
  receiptPrefix: string;
}): Promise<boolean> {
  if (!p.orderId || !p.paymentId || !p.signature) return false;
  if (!verifyRazorpayPaymentSignature(p.orderId, p.paymentId, p.signature)) return false;
  const order = await fetchRazorpayOrder(p.orderId);
  return !!order && order.amount === Math.round(p.amountRupees * 100) && !!order.receipt?.startsWith(p.receiptPrefix);
}
