import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAgentApi } from "@/lib/agentApi";
import { visibleInterestsForAgent, shopLink } from "@/lib/buyerInterest";

// Buyers who paid to see a property: the ones waiting for a partner and the ones this partner already took.
export async function GET() {
  const g = await requireAgentApi();
  if ("error" in g) return g.error;
  const [waiting, mine] = await Promise.all([
    visibleInterestsForAgent(g.agent.id),
    prisma.buyerInterestAcceptance.findMany({
      where: { agentId: g.agent.id },
      orderBy: { acceptedAt: "desc" },
      take: 50,
      include: { interest: true },
    }),
  ]);
  const buyers = await prisma.user.findMany({
    where: { id: { in: [...new Set(mine.map((m) => m.interest.buyerId))] } },
    select: { id: true, name: true, phone: true },
  });
  return NextResponse.json({
    shopLink: g.agent.agentCode ? shopLink(g.agent.agentCode) : null,
    waiting,
    accepted: mine.map((m) => {
      const b = buyers.find((x) => x.id === m.interest.buyerId);
      return { id: m.id, interestId: m.interestId, buyerName: b?.name ?? "Buyer", buyerPhone: b?.phone ?? null, acceptedAt: m.acceptedAt.toISOString() };
    }),
  });
}
