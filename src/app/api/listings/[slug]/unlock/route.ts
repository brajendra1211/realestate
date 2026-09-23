import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getListingBySlug } from "@/lib/listing";
import { unlockAgentListing, UnlockServiceError } from "@/lib/unlock";

// Simulated payment — no gateway wired in yet (see src/lib/unlock.ts). This is
// the endpoint to attach real Razorpay payment capture to before going live.
export async function POST(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;
  const listing = await getListingBySlug(slug);
  if (!listing) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }

  try {
    const unlock = await unlockAgentListing(session.user.id, listing.id);
    return NextResponse.json(unlock, { status: 201 });
  } catch (error) {
    if (error instanceof UnlockServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
