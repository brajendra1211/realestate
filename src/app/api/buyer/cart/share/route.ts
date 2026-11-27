import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { CartError, shareCart } from "@/lib/cart";

// Share Cart (no agentCode: just a link) or Send to Agent (agentCode set).
export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  try {
    const r = await shareCart(session.user.id, { agentCode: body?.agentCode ?? null, note: body?.note ?? null });
    return NextResponse.json({ url: r.url, token: r.token, count: r.count, sentToAgent: !!r.agentId });
  } catch (e) {
    return NextResponse.json({ error: e instanceof CartError ? e.message : "Failed" }, { status: 400 });
  }
}
