import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { visibleToAgentWhere } from "@/lib/listingRequest";
import { visibleInterestsForAgent } from "@/lib/buyerInterest";

// Polled by the buzzer in the partner panel: requests that were alerted to this
// partner and are still waiting for someone to accept. No owner contact is
// revealed here — only the accepting partner gets that.
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const agent = await prisma.agentProfile.findUnique({ where: { userId: session.user.id }, select: { id: true, status: true, primeStatus: true } });
  if (!agent || agent.status !== "APPROVED" || !agent.primeStatus) return NextResponse.json({ pending: [], interests: [] });

  const rows = await prisma.listingRequest.findMany({
    where: visibleToAgentWhere(agent.id),
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, city: true, locality: true, plan: true, createdAt: true, buzzCount: true },
  });
  const interests = await visibleInterestsForAgent(agent.id);
  return NextResponse.json({ pending: rows, interests });
}
