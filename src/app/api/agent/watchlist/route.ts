import { NextResponse } from "next/server";
import { fail, requireAgentApi } from "@/lib/agentApi";
import { claimWatchForAgent, listOpenWatchesForAgent } from "@/lib/watchlist";
import { sharedCartsForAgent } from "@/lib/cart";

// Open customer requirements an agent can answer with "I have a property".
export async function GET() {
  const g = await requireAgentApi();
  if ("error" in g) return g.error;
  return NextResponse.json(await listOpenWatchesForAgent());
}

// body { watchId, listingId? }
export async function POST(request: Request) {
  const g = await requireAgentApi();
  if ("error" in g) return g.error;
  const b = await request.json().catch(() => ({}));
  try {
    await claimWatchForAgent(String(b.watchId ?? ""), g.agent.id, b.listingId ? String(b.listingId) : null);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e, "Could not update.");
  }
}

// Carts customers sent to this agent.
export async function PUT() {
  const g = await requireAgentApi();
  if ("error" in g) return g.error;
  const rows = await sharedCartsForAgent(g.agent.id);
  return NextResponse.json(rows.map((r) => ({ token: r.token, note: r.note, createdAt: r.createdAt, items: JSON.parse(r.itemsJson) })));
}
