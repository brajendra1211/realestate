import { prisma } from "@/lib/prisma";
import { isTopRatedAgent } from "@/lib/rating";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type AgentOfWeekBadge = "TOP_SELLER" | "FASTEST_RESPONDER" | "5-STAR";

export type AgentOfWeekCard = {
  agentId: string;
  agentCode: string;
  agentName: string;
  city: string | null;
  phone: string | null;
  badge: AgentOfWeekBadge;
};

async function topSeller(since: Date): Promise<AgentOfWeekCard | null> {
  const grouped = await prisma.commissionLedgerEntry.groupBy({
    by: ["agentId"],
    where: { createdAt: { gte: since } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 1,
  });
  const top = grouped[0];
  if (!top || !top._sum.amount) return null;

  const agent = await prisma.agentProfile.findUnique({
    where: { id: top.agentId },
    include: { user: { select: { name: true, phone: true } } },
  });
  if (!agent?.agentCode) return null;

  return {
    agentId: agent.id,
    agentCode: agent.agentCode,
    agentName: agent.user.name,
    city: agent.city,
    phone: agent.user.phone,
    badge: "TOP_SELLER",
  };
}

async function fastestResponder(since: Date): Promise<AgentOfWeekCard | null> {
  const matched = await prisma.dispatchRequest.findMany({
    where: { status: "MATCHED", acceptedAt: { gte: since }, acceptedByAgentId: { not: null } },
    select: { id: true, acceptedAt: true, acceptedByAgentId: true },
  });
  if (matched.length === 0) return null;

  const responseTimes = new Map<string, number[]>();
  for (const dispatch of matched) {
    const notification = await prisma.dispatchNotification.findUnique({
      where: { dispatchRequestId_agentId: { dispatchRequestId: dispatch.id, agentId: dispatch.acceptedByAgentId! } },
    });
    if (!notification || !dispatch.acceptedAt) continue;
    const ms = dispatch.acceptedAt.getTime() - notification.createdAt.getTime();
    const list = responseTimes.get(dispatch.acceptedByAgentId!) ?? [];
    list.push(ms);
    responseTimes.set(dispatch.acceptedByAgentId!, list);
  }

  let bestAgentId: string | null = null;
  let bestAvg = Infinity;
  for (const [agentId, times] of responseTimes) {
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    if (avg < bestAvg) {
      bestAvg = avg;
      bestAgentId = agentId;
    }
  }
  if (!bestAgentId) return null;

  const agent = await prisma.agentProfile.findUnique({
    where: { id: bestAgentId },
    include: { user: { select: { name: true, phone: true } } },
  });
  if (!agent?.agentCode) return null;

  return {
    agentId: agent.id,
    agentCode: agent.agentCode,
    agentName: agent.user.name,
    city: agent.city,
    phone: agent.user.phone,
    badge: "FASTEST_RESPONDER",
  };
}

async function fiveStarAgent(): Promise<AgentOfWeekCard | null> {
  const agent = await prisma.agentProfile.findFirst({
    where: { primeStatus: true, ratingAvg: { gte: 4.5 } },
    include: { user: { select: { name: true, phone: true } }, _count: { select: { ratings: true } } },
    orderBy: { ratingAvg: "desc" },
  });
  if (!agent?.agentCode || !isTopRatedAgent(agent.ratingAvg, agent._count.ratings)) return null;

  return {
    agentId: agent.id,
    agentCode: agent.agentCode,
    agentName: agent.user.name,
    city: agent.city,
    phone: agent.user.phone,
    badge: "5-STAR",
  };
}

// "Agents of the Week" cards — §3.18. Three badge slots (Top Seller /
// Fastest Responder / 5-Star), each independently computed; a single agent
// could legitimately win more than one, in which case they show once per
// badge they earned (not deduped into one card) — that's the point of the
// badge, not just a leaderboard rank.
export async function getAgentsOfTheWeek(): Promise<AgentOfWeekCard[]> {
  const since = new Date(Date.now() - WEEK_MS);
  const [seller, responder, fiveStar] = await Promise.all([
    topSeller(since),
    fastestResponder(since),
    fiveStarAgent(),
  ]);
  return [seller, responder, fiveStar].filter((x): x is AgentOfWeekCard => x !== null);
}

export type TickerItem = {
  agentCode: string;
  label: string;
  at: Date;
};

// "24-hour scrolling ticker of same-day deal closers" — §3.18. Combines
// every revenue-generating "win" an agent had today: closed brokerage
// deals, investor profit-share cycles, and matched dispatch leads.
export async function getTodaysDealTicker(): Promise<TickerItem[]> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [deals, profitDistributions, dispatches] = await Promise.all([
    prisma.deal.findMany({
      where: { dealDate: { gte: startOfDay } },
      include: {
        buyerAgent: { select: { agentCode: true } },
        sellerAgent: { select: { agentCode: true } },
      },
    }),
    prisma.profitDistribution.findMany({
      where: { distributedAt: { gte: startOfDay } },
      include: { agent: { select: { agentCode: true } } },
    }),
    prisma.dispatchRequest.findMany({
      where: { status: "MATCHED", acceptedAt: { gte: startOfDay } },
      include: { acceptedAgent: { select: { agentCode: true } } },
    }),
  ]);

  const items: TickerItem[] = [];
  for (const deal of deals) {
    if (deal.buyerAgent?.agentCode) {
      items.push({ agentCode: deal.buyerAgent.agentCode, label: "closed a brokerage deal", at: deal.dealDate });
    }
    if (deal.sellerAgent?.agentCode) {
      items.push({ agentCode: deal.sellerAgent.agentCode, label: "closed a brokerage deal", at: deal.dealDate });
    }
  }
  for (const dist of profitDistributions) {
    if (dist.agent.agentCode) {
      items.push({ agentCode: dist.agent.agentCode, label: "closed an investor deal cycle", at: dist.distributedAt });
    }
  }
  for (const dispatch of dispatches) {
    if (dispatch.acceptedAgent?.agentCode && dispatch.acceptedAt) {
      items.push({ agentCode: dispatch.acceptedAgent.agentCode, label: "picked up a new lead", at: dispatch.acceptedAt });
    }
  }

  return items.sort((a, b) => b.at.getTime() - a.at.getTime());
}

export type AreaDominance = {
  area: string;
  agentCode: string;
  agentName: string;
  listingCount: number;
};

// "King of Sector-74"-style area-dominance tags — §3.18: the agent with the
// most active listings in a locality, computed live rather than a stored
// title (so it always reflects current standing, not a one-time award).
const MIN_LISTINGS_FOR_DOMINANCE = 3;

export async function getAreaDominance(): Promise<AreaDominance[]> {
  const listings = await prisma.agentListing.findMany({
    where: { agentId: { not: null }, approvalStatus: "APPROVED" },
    select: {
      agentId: true,
      agent: { select: { agentCode: true, user: { select: { name: true } } } },
      masterProperty: { select: { locality: true, city: true } },
    },
  });

  const counts = new Map<string, Map<string, { count: number; agentCode: string; agentName: string }>>();
  for (const listing of listings) {
    if (!listing.agentId || !listing.agent?.agentCode) continue;
    const area = listing.masterProperty.locality ?? listing.masterProperty.city;
    const byAgent = counts.get(area) ?? new Map();
    const existing = byAgent.get(listing.agentId);
    byAgent.set(listing.agentId, {
      count: (existing?.count ?? 0) + 1,
      agentCode: listing.agent.agentCode,
      agentName: listing.agent.user.name,
    });
    counts.set(area, byAgent);
  }

  const result: AreaDominance[] = [];
  for (const [area, byAgent] of counts) {
    let top: { count: number; agentCode: string; agentName: string } | null = null;
    for (const entry of byAgent.values()) {
      if (!top || entry.count > top.count) top = entry;
    }
    if (top && top.count >= MIN_LISTINGS_FOR_DOMINANCE) {
      result.push({ area, agentCode: top.agentCode, agentName: top.agentName, listingCount: top.count });
    }
  }
  return result.sort((a, b) => b.listingCount - a.listingCount);
}
