import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { getAgentCycleProgress, issuePreExpiryDiscountCoupon, TargetCycleError } from "@/lib/targetCycle";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  try {
    const cycle = await getAgentCycleProgress(agent.id);
    return NextResponse.json(cycle);
  } catch (error) {
    if (error instanceof TargetCycleError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to get cycle progress", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  try {
    const coupon = await issuePreExpiryDiscountCoupon(agent.id);
    return NextResponse.json(coupon);
  } catch (error) {
    if (error instanceof TargetCycleError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to issue discount coupon", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
