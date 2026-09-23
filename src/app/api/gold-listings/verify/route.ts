import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { verifyAndCreateGoldListing, GoldListingServiceError, type CreateGoldListingInput } from "@/lib/goldListing";

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.input || typeof body.input !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = { ...(body.input as CreateGoldListingInput), buyerId: session.user.id };

  try {
    const listing = await verifyAndCreateGoldListing(
      input,
      String(body.razorpayOrderId ?? ""),
      String(body.razorpayPaymentId ?? ""),
      String(body.razorpaySignature ?? "")
    );
    return NextResponse.json({ slug: listing.slug }, { status: 201 });
  } catch (error) {
    if (error instanceof GoldListingServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
