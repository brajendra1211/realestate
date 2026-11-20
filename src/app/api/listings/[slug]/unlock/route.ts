import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getListingBySlug } from "@/lib/listing";
import { createUnlockOrder, verifyAndUnlockListing, UnlockServiceError } from "@/lib/unlock";
import { getRazorpayKeyId } from "@/lib/razorpay";

// Two steps, both behind a real Razorpay payment:
//   1. POST {}                         -> creates an order (returns order + keyId)
//   2. POST {razorpay_* fields}        -> verifies the payment, then unlocks
// There is no way to unlock without a verified payment.
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;
  const listing = await getListingBySlug(slug);
  if (!listing) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));

  try {
    if (body?.razorpayOrderId && body?.razorpayPaymentId && body?.razorpaySignature) {
      const unlock = await verifyAndUnlockListing(
        session.user.id,
        listing.id,
        String(body.razorpayOrderId),
        String(body.razorpayPaymentId),
        String(body.razorpaySignature)
      );
      return NextResponse.json(unlock, { status: 201 });
    }

    const result = await createUnlockOrder(session.user.id, listing.id);
    if (result.alreadyUnlocked) return NextResponse.json({ alreadyUnlocked: true });
    if (!result.order) return NextResponse.json({ error: "paymentUnavailable" }, { status: 503 });
    return NextResponse.json({ requiresPayment: true, order: result.order, keyId: getRazorpayKeyId() }, { status: 402 });
  } catch (error) {
    if (error instanceof UnlockServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
