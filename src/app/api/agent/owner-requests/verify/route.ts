import { NextResponse } from "next/server";
import { requireAgentApi, fail } from "@/lib/agentApi";
import { verifyAndPublish } from "@/lib/listingRequest";

// The owner reads out the OTP: the listing goes live and the partner share is credited.
export async function POST(request: Request) {
  const g = await requireAgentApi();
  if ("error" in g) return g.error;
  const { id, code } = (await request.json().catch(() => ({}))) as { id?: string; code?: string };
  if (!id || !code) return fail(null, "Missing id or code");
  try {
    const listing = await verifyAndPublish(id, g.agent.id, code);
    return NextResponse.json({ ok: true, slug: listing.slug });
  } catch (e) {
    return fail(e);
  }
}
