import { prisma } from "@/lib/prisma";

// IST day bucket so "today" matches the team's clock, not the server's.
const IST_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
export const dayKey = (d: Date) => new Date(d.getTime() + IST_MS).toISOString().slice(0, 10);

export const STREAMS = [
  { key: "unlocks", name: "Buyer ₹100 fees" },
  { key: "owner", name: "Owner plans" },
  { key: "partner", name: "Partner memberships" },
  { key: "gold", name: "Gold listings" },
  { key: "investor", name: "Referral Partner fees" },
  { key: "deals", name: "Deal commission" },
] as const;
export type StreamKey = (typeof STREAMS)[number]["key"];

export type SalesStats = {
  days: number;
  labels: string[]; // yyyy-mm-dd, oldest first
  revenue: Record<StreamKey, number[]>;
  totals: Record<StreamKey, number>;
  revenueTotal: number;
  revenuePrev: number;
  enquiries: number[];
  unlocks: number[];
  requirements: number[];
  leadsTotal: number;
  leadsPrev: number;
  dealsClosed: number;
  dealsClosedPrev: number;
  newPartners: number;
  newPartnersPrev: number;
  dealsByStatus: { status: string; count: number; value: number }[];
  topPartners: { name: string; code: string | null; amount: number }[];
  dailyRevenue: number[];
};

export async function getSalesStats(days: number): Promise<SalesStats> {
  const now = new Date();
  const start = new Date(now.getTime() - days * DAY_MS);
  const prevStart = new Date(now.getTime() - 2 * days * DAY_MS);

  const labels: string[] = [];
  for (let i = days - 1; i >= 0; i--) labels.push(dayKey(new Date(now.getTime() - i * DAY_MS)));
  const index = new Map(labels.map((l, i) => [l, i]));
  const zeros = () => labels.map(() => 0);

  const [unlocks, dispatches, listingReqs, subs, golds, investors, deals, enquiries, partners, dealGroups, ledger, shopUnlocks] = await Promise.all([
    prisma.propertyUnlock.findMany({ where: { createdAt: { gte: prevStart } }, select: { createdAt: true, amount: true } }),
    prisma.dispatchRequest.findMany({ where: { createdAt: { gte: prevStart }, amount: { gt: 0 } }, select: { createdAt: true, amount: true } }),
    prisma.listingRequest.findMany({ where: { paidAt: { gte: prevStart } }, select: { paidAt: true, amount: true } }),
    // PENDING = a plan the user only requested (no payment yet), so it isn't revenue.
    prisma.subscription.findMany({
      where: { createdAt: { gte: prevStart }, amount: { not: null }, status: { not: "PENDING" } },
      select: { createdAt: true, amount: true, user: { select: { role: true } } },
    }),
    prisma.goldListingPurchase.findMany({ where: { createdAt: { gte: prevStart } }, select: { createdAt: true, amount: true } }),
    prisma.investorProfile.findMany({ where: { createdAt: { gte: prevStart }, feeStatus: "PAID" }, select: { createdAt: true, registrationFee: true } }),
    prisma.deal.findMany({
      where: { dealDate: { gte: prevStart }, status: { in: ["CLOSED", "REGISTRY_COMPLETED"] } },
      select: { dealDate: true, platformCommission: true },
    }),
    prisma.enquiry.findMany({ where: { createdAt: { gte: prevStart } }, select: { createdAt: true } }),
    prisma.agentProfile.findMany({ where: { createdAt: { gte: prevStart } }, select: { createdAt: true } }),
    prisma.deal.groupBy({ by: ["status"], _count: { _all: true }, _sum: { dealValue: true } }),
    prisma.commissionLedgerEntry.groupBy({
      by: ["agentId"],
      where: { createdAt: { gte: start }, amount: { gt: 0 } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
    prisma.agentShopUnlock.findMany({ where: { createdAt: { gte: prevStart } }, select: { createdAt: true, amount: true } }),
  ]);

  const revenue: Record<StreamKey, number[]> = {
    unlocks: zeros(),
    owner: zeros(),
    partner: zeros(),
    gold: zeros(),
    investor: zeros(),
    deals: zeros(),
  };
  let revenuePrev = 0;
  const addMoney = (stream: StreamKey, at: Date | null, amount: number | null | undefined) => {
    if (!at || !amount) return;
    if (at < start) {
      revenuePrev += amount;
      return;
    }
    const i = index.get(dayKey(at));
    if (i !== undefined) revenue[stream][i] += amount;
  };
  unlocks.forEach((r) => addMoney("unlocks", r.createdAt, r.amount));
  dispatches.forEach((r) => addMoney("unlocks", r.createdAt, r.amount));
  shopUnlocks.forEach((r) => addMoney("unlocks", r.createdAt, r.amount));
  listingReqs.forEach((r) => addMoney("owner", r.paidAt, r.amount));
  // Channel-partner memberships vs owner/dealer plans go to their own streams.
  subs.forEach((r) => addMoney(r.user.role === "AGENT" ? "partner" : "owner", r.createdAt, r.amount));
  golds.forEach((r) => addMoney("gold", r.createdAt, r.amount));
  investors.forEach((r) => addMoney("investor", r.createdAt, r.registrationFee));
  deals.forEach((r) => addMoney("deals", r.dealDate, r.platformCommission));

  const series = (rows: { createdAt: Date }[]) => {
    const out = zeros();
    let prev = 0;
    for (const r of rows) {
      if (r.createdAt < start) prev++;
      else {
        const i = index.get(dayKey(r.createdAt));
        if (i !== undefined) out[i]++;
      }
    }
    return { out, prev };
  };
  const enq = series(enquiries);
  const unl = series(unlocks);
  const req = series(dispatches);

  const totals = Object.fromEntries(STREAMS.map((s) => [s.key, revenue[s.key].reduce((a, b) => a + b, 0)])) as Record<StreamKey, number>;
  const dailyRevenue = labels.map((_, i) => STREAMS.reduce((sum, s) => sum + revenue[s.key][i], 0));

  const agentRows = await prisma.agentProfile.findMany({
    where: { id: { in: ledger.map((l) => l.agentId) } },
    select: { id: true, agentCode: true, user: { select: { name: true } } },
  });

  return {
    days,
    labels,
    revenue,
    totals,
    revenueTotal: Object.values(totals).reduce((a, b) => a + b, 0),
    revenuePrev,
    enquiries: enq.out,
    unlocks: unl.out,
    requirements: req.out,
    leadsTotal: enq.out.reduce((a, b) => a + b, 0) + unl.out.reduce((a, b) => a + b, 0) + req.out.reduce((a, b) => a + b, 0),
    leadsPrev: enq.prev + unl.prev + req.prev,
    dealsClosed: deals.filter((d) => d.dealDate >= start).length,
    dealsClosedPrev: deals.filter((d) => d.dealDate < start).length,
    newPartners: partners.filter((p) => p.createdAt >= start).length,
    newPartnersPrev: partners.filter((p) => p.createdAt < start).length,
    dealsByStatus: dealGroups.map((g) => ({ status: g.status, count: g._count._all, value: g._sum.dealValue ?? 0 })),
    topPartners: ledger.map((l) => {
      const a = agentRows.find((x) => x.id === l.agentId);
      return { name: a?.user.name ?? "Partner", code: a?.agentCode ?? null, amount: l._sum.amount ?? 0 };
    }),
    dailyRevenue,
  };
}

export type MonitorStats = {
  pendingProperties: number;
  ownerRequestsWaiting: number;
  buyerLeadsWaiting: number;
  buyLeadsUncalled: number;
  supportOverdue: number;
  partnersLapsed: number;
  listingsExpiringWeek: number;
};

export async function getMonitorStats(): Promise<MonitorStats> {
  const now = new Date();
  const week = new Date(now.getTime() + 7 * DAY_MS);
  const [pendingProperties, ownerRequestsWaiting, buyerLeadsWaiting, buyLeadsUncalled, supportOverdue, partnersLapsed, listingsExpiringWeek] =
    await Promise.all([
      prisma.property.count({ where: { approvalStatus: "PENDING" } }),
      prisma.listingRequest.count({ where: { status: { in: ["SEARCHING", "ADMIN_DESK"] } } }),
      prisma.buyerInterest.count({ where: { status: "OPEN" } }),
      prisma.dispatchRequest.count({ where: { purpose: "BUY", contactedAt: null } }),
      prisma.supportTicket.count({ where: { status: { not: "RESOLVED" }, dueAt: { lt: now } } }),
      prisma.agentProfile.count({ where: { status: "APPROVED", primeStatus: false } }),
      prisma.agentListing.count({ where: { isDelisted: false, agreementExpiryDate: { gte: now, lte: week } } }),
    ]);
  return { pendingProperties, ownerRequestsWaiting, buyerLeadsWaiting, buyLeadsUncalled, supportOverdue, partnersLapsed, listingsExpiringWeek };
}

export const formatINR = (n: number) =>
  n >= 10000000 ? `₹${(n / 10000000).toFixed(2)} Cr` : n >= 100000 ? `₹${(n / 100000).toFixed(2)} L` : `₹${Math.round(n).toLocaleString("en-IN")}`;
