import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ringAgentListing } from "@/lib/agentListingRing";
import { sendPushToUser } from "@/lib/push";

// TEMPORARY — self-test only. See prior commit history for context.
const TEST_BUYER_ID = "cmvp4aix1000q17fn125xvoyr";
const TEST_LISTING_ID = "cmvp395ds000517fnvtcqy49q";
const TEST_AGENT_USER_ID = "cmvp1y3jd000117fn17d2c6ev";

export async function GET() {
  await prisma.savedAgentListing.upsert({
    where: { userId_agentListingId: { userId: TEST_BUYER_ID, agentListingId: TEST_LISTING_ID } },
    create: { userId: TEST_BUYER_ID, agentListingId: TEST_LISTING_ID },
    update: {},
  });

  try {
    const result = await ringAgentListing(TEST_BUYER_ID, TEST_LISTING_ID);
    // Diagnostic-only second send, to surface the actual per-token FCM
    // response (ringAgentListing's own send result isn't returned to the
    // caller) — investigating why nothing reaches the device despite the
    // server reporting success.
    const pushDiagnostic = await sendPushToUser(
      TEST_AGENT_USER_ID,
      { title: "Debug diagnostic ring", body: "Checking FCM response detail." },
      { type: "property-ring", propertyId: TEST_LISTING_ID, propertyTitle: "Debug", buyerName: "Debug", buyerPhone: "" }
    );
    return NextResponse.json({ ok: true, result, pushDiagnostic });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
