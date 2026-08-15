import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { createBroadcast, getBroadcastsForAgent, BroadcastServiceError } from "@/lib/broadcast";
import type { BroadcastTxnType } from "@/generated/prisma";

async function requirePrimeAgent() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") return null;
  const agent = await getAgentByUserId(session.user.id);
  if (!agent || agent.status !== "APPROVED" || !agent.primeStatus) return null;
  return agent;
}

export async function GET() {
  const agent = await requirePrimeAgent();
  if (!agent) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const broadcasts = await getBroadcastsForAgent(agent.id);
  return NextResponse.json(broadcasts);
}

export async function POST(request: Request) {
  const agent = await requirePrimeAgent();
  if (!agent) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const broadcast = await createBroadcast(agent.id, {
      radiusKm: Number(body.radiusKm ?? 1),
      society: body.society ? String(body.society) : null,
      flatSize: String(body.flatSize ?? ""),
      txnType: (body.txnType as BroadcastTxnType) ?? "BUY",
      budgetMin: Number(body.budgetMin ?? 0),
      budgetMax: Number(body.budgetMax ?? 0),
    });
    return NextResponse.json(broadcast, { status: 201 });
  } catch (error) {
    if (error instanceof BroadcastServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Creating broadcast failed", error);
    return NextResponse.json({ error: "Failed to create broadcast" }, { status: 500 });
  }
}
