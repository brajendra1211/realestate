import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getListingBySlug } from "@/lib/listing";
import { ringAgentListing, AgentListingRingError } from "@/lib/agentListingRing";

// Mobile/app counterpart to the buyer dashboard's web-only "Ring" action
// (src/app/buyer/actions.ts) — ringAgentListing() itself was already fully
// built, it just had no route reachable from the Flutter app. Slug-based to
// match this listing's other app-facing routes (GET/unlock), resolving the
// id server-side instead of exposing it to the client separately.
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
    const result = await ringAgentListing(session.user.id, listing.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof AgentListingRingError) {
      const status = e.message === "dailyLimitReached" ? 429 : 400;
      return NextResponse.json({ error: e.message }, { status });
    }
    throw e;
  }
}
