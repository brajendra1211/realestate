import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { renewPropertyListing } from "@/lib/listingDelist";
import type { ListingPlanTier } from "@/generated/prisma";

/**
 * POST /api/agent/listings/[id]/renew
 * PDF 1 Page 1 & 2, Page 7:
 * Renews a listing for 30 days (Basic ₹200) or 90 days (Gold ₹500).
 * 50% fee split credited to agent wallet.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) {
    return NextResponse.json({ error: "Agent not found" }, { status: 404 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const planTier: ListingPlanTier = body.planTier === "GOLD" ? "GOLD" : "BASIC";

  try {
    const renewed = await renewPropertyListing(id, planTier, agent.id);
    return NextResponse.json({
      success: true,
      listing: renewed,
      message: `Listing renewed successfully for ${planTier === "GOLD" ? "90" : "30"} days.`,
    });
  } catch (error: any) {
    console.error("Failed to renew listing", error);
    return NextResponse.json({ error: error.message || "Failed to renew listing" }, { status: 400 });
  }
}
