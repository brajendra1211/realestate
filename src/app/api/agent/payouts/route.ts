import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { getPayoutsForAgent, requestAgentPayout, PayoutServiceError } from "@/lib/payout";

async function requireAgent() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") return null;
  return getAgentByUserId(session.user.id);
}

export async function GET() {
  const agent = await requireAgent();
  if (!agent) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payouts = await getPayoutsForAgent(agent.id);
  return NextResponse.json(payouts);
}

export async function POST(request: Request) {
  const agent = await requireAgent();
  if (!agent) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const payout = await requestAgentPayout(agent.id, Number(body.amount));
    return NextResponse.json(payout, { status: 201 });
  } catch (error) {
    if (error instanceof PayoutServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Requesting payout failed", error);
    return NextResponse.json({ error: "Failed to request payout" }, { status: 500 });
  }
}
