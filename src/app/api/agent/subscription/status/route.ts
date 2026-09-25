import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAgentSubscriptionStatus } from "@/lib/agentPlans";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agent = await prisma.agentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!agent) {
    return NextResponse.json({ error: "Channel Partner profile not found" }, { status: 404 });
  }

  try {
    const status = await getAgentSubscriptionStatus(agent.id);
    return NextResponse.json(status);
  } catch (error) {
    console.error("Failed to fetch subscription status", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
