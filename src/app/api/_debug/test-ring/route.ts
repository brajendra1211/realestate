import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ringAgentListing } from "@/lib/agentListingRing";

// TEMPORARY — self-test only, for diagnosing why the agent dashboard's ring
// alert wasn't arriving. Exercises the exact same ringAgentListing() path
// the real "Ring this channel partner" button uses, from inside the live
// server process (so emitToAgent reaches real connected sockets), without
// needing a human to manually drive a buyer session through OTP. Delete
// this route once the socket/ring delivery issue is confirmed fixed.
const TEST_BUYER_ID = "cmvp4aix1000q17fn125xvoyr";
const TEST_LISTING_ID = "cmvp395ds000517fnvtcqy49q";

export async function GET() {
  await prisma.savedAgentListing.upsert({
    where: { userId_agentListingId: { userId: TEST_BUYER_ID, agentListingId: TEST_LISTING_ID } },
    create: { userId: TEST_BUYER_ID, agentListingId: TEST_LISTING_ID },
    update: {},
  });

  try {
    const result = await ringAgentListing(TEST_BUYER_ID, TEST_LISTING_ID);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
