import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";

export class TargetCycleError extends Error {}

const CYCLE_DURATION_DAYS = 60;
const CYCLE_MS = CYCLE_DURATION_DAYS * 24 * 60 * 60 * 1000;

import { getSiteSettings } from "@/lib/site-settings";

export async function getAgentCycleProgress(agentProfileId: string) {
  const [agent, settings] = await Promise.all([
    prisma.agentProfile.findUnique({
      where: { id: agentProfileId },
      include: { user: true },
    }),
    getSiteSettings(),
  ]);
  if (!agent) throw new TargetCycleError("Channel Partner not found");

  const cycleDays = agent.customTargetEnabled && agent.cycleDaysTarget
    ? agent.cycleDaysTarget
    : (settings.partnerTargetDays ?? 30);
  const cycleMs = cycleDays * 24 * 60 * 60 * 1000;

  const now = new Date();
  const startDate = agent.cycleStartDate ?? agent.createdAt;
  const endDate = agent.cycleEndDate ?? new Date(startDate.getTime() + cycleMs);

  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  // Count activity during current cycle
  const [listingsCount, dealsCount, visitsCount, directAgentsCount, investorsCount] = await Promise.all([
    prisma.agentListing.count({
      where: {
        agentId: agent.id,
        createdAt: { gte: startDate },
      },
    }),
    prisma.deal.count({
      where: {
        OR: [{ buyerAgentId: agent.id }, { sellerAgentId: agent.id }],
        status: { in: ["REGISTRY_COMPLETED", "CLOSED"] },
        createdAt: { gte: startDate },
      },
    }),
    prisma.propertyVisitLog.count({
      where: {
        agentId: agent.id,
        visitedAt: { gte: startDate },
      },
    }),
    prisma.agentProfile.count({
      where: {
        referringAgentId: agent.id,
        createdAt: { gte: startDate },
      },
    }),
    prisma.investorProfile.count({
      where: {
        referringAgentId: agent.id,
        createdAt: { gte: startDate },
      },
    }),
  ]);

  // Target values: Custom override if enabled, otherwise global default
  const targetProperties = agent.customTargetEnabled
    ? agent.cycleCustomerPropertiesTarget
    : (settings.partnerTargetProperties ?? 20);
  const targetDirectAgents = agent.customTargetEnabled
    ? agent.cycleDirectAgentsTarget
    : (settings.partnerTargetSubPartners ?? 10);
  const targetInvestors = agent.customTargetEnabled
    ? agent.cycleInvestorsTarget
    : (settings.partnerTargetInvestors ?? 3);

  // Remaining counts
  const remainingProperties = Math.max(0, targetProperties - listingsCount);
  const remainingDirectAgents = Math.max(0, targetDirectAgents - directAgentsCount);
  const remainingInvestors = Math.max(0, targetInvestors - investorsCount);

  // Percentage calculations (0-100%)
  const propProgressPercent = Math.min(100, Math.round((listingsCount / (targetProperties || 1)) * 100));
  const agtProgressPercent = Math.min(100, Math.round((directAgentsCount / (targetDirectAgents || 1)) * 100));
  const invProgressPercent = Math.min(100, Math.round((investorsCount / (targetInvestors || 1)) * 100));

  const overallPercent = Math.round((propProgressPercent + agtProgressPercent + invProgressPercent) / 3);

  const isTaskMet =
    listingsCount >= targetProperties &&
    directAgentsCount >= targetDirectAgents &&
    investorsCount >= targetInvestors;

  let trafficLight: "GREEN" | "YELLOW" | "RED" = "YELLOW";
  if (isTaskMet) {
    trafficLight = "GREEN";
  } else if (daysRemaining <= 7 && overallPercent < 50) {
    trafficLight = "RED";
  } else if (overallPercent >= 50) {
    trafficLight = "YELLOW";
  } else {
    trafficLight = daysRemaining <= 15 ? "RED" : "YELLOW";
  }

  const isCouponActive =
    Boolean(agent.activeDiscountCoupon) &&
    Boolean(agent.couponExpiresAt && agent.couponExpiresAt.getTime() > now.getTime());

  return {
    agentId: agent.id,
    agentCode: agent.agentCode,
    shopName: agent.shopName,
    userName: agent.user.name,
    userPhone: agent.user.phone,
    userEmail: agent.user.email,
    city: agent.city,
    customTargetEnabled: agent.customTargetEnabled,
    cycleDays,
    cycleStartDate: startDate,
    cycleEndDate: endDate,
    daysRemaining,
    planTier: agent.planTier,
    trafficLight,
    targets: {
      properties: targetProperties,
      customerProperties: targetProperties,
      directAgents: targetDirectAgents,
      investors: targetInvestors,
      deals: agent.cycleDealsTarget,
      visits: agent.cycleVisitsTarget,
      listings: agent.cycleListingsTarget,
    },
    achieved: {
      properties: listingsCount,
      customerProperties: listingsCount,
      directAgents: directAgentsCount,
      investors: investorsCount,
      deals: dealsCount,
      visits: visitsCount,
      listings: listingsCount,
    },
    remaining: {
      properties: remainingProperties,
      customerProperties: remainingProperties,
      directAgents: remainingDirectAgents,
      investors: remainingInvestors,
    },
    percentages: {
      properties: propProgressPercent,
      customerProperties: propProgressPercent,
      directAgents: agtProgressPercent,
      investors: invProgressPercent,
      overall: overallPercent,
    },
    isTargetMet: isTaskMet,
    carryForwardScore: agent.carryForwardScore,
    cycleCompletedCount: agent.cycleCompletedCount,
    coupon: isCouponActive
      ? {
          code: agent.activeDiscountCoupon,
          discountPercent: 20,
          expiresAt: agent.couponExpiresAt,
        }
      : null,
  };
}

/**
 * Fetches all Channel Partners along with their target achievement progress.
 * Default sort: LOWEST achievement percentage first (so under-performers surface to the top).
 */
export async function getAllPartnersTargetProgress(options?: {
  sortBy?: "lowest_first" | "highest_first" | "days_remaining";
  search?: string;
}) {
  const agents = await prisma.agentProfile.findMany({
    where: { status: "APPROVED" },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  const progressList = await Promise.all(
    agents.map((agent) => getAgentCycleProgress(agent.id).catch(() => null))
  );

  let filtered = progressList.filter((p): p is NonNullable<typeof p> => p !== null);

  if (options?.search) {
    const q = options.search.toLowerCase().trim();
    filtered = filtered.filter(
      (p) =>
        p.userName.toLowerCase().includes(q) ||
        (p.shopName && p.shopName.toLowerCase().includes(q)) ||
        (p.agentCode && p.agentCode.toLowerCase().includes(q)) ||
        (p.city && p.city.toLowerCase().includes(q))
    );
  }

  // Sorting
  const sortBy = options?.sortBy ?? "lowest_first";
  if (sortBy === "lowest_first") {
    // Lowest target achieved comes first!
    filtered.sort((a, b) => a.percentages.overall - b.percentages.overall);
  } else if (sortBy === "highest_first") {
    filtered.sort((a, b) => b.percentages.overall - a.percentages.overall);
  } else if (sortBy === "days_remaining") {
    filtered.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  return filtered;
}

/**
 * Fetches all direct referred agent codes and direct customer property listings
 * along with their expiry & renewal due dates so the agent can follow up via Call or WhatsApp.
 */
export async function getDirectNetworkAndRenewals(agentProfileId: string) {
  const now = new Date();

  // 1. Direct referred agents
  const directAgents = await prisma.agentProfile.findMany({
    where: { referringAgentId: agentProfileId },
    include: { user: { select: { name: true, phone: true, whatsappNumber: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  const formattedAgents = directAgents.map((a) => {
    // Renewal date: 30 days after plan tier or cycleEndDate
    const renewalDate = a.cycleEndDate ?? new Date(a.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    const daysToRenewal = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      id: a.id,
      agentCode: a.agentCode ?? "Pending Code",
      name: a.user.name,
      phone: a.user.phone ?? a.alternatePhone ?? "",
      whatsapp: a.user.whatsappNumber ?? a.user.phone ?? a.alternatePhone ?? "",
      joinedAt: a.createdAt,
      renewalDate,
      daysToRenewal,
      isExpired: daysToRenewal <= 0,
      planTier: a.planTier,
      primeStatus: a.primeStatus,
    };
  });

  // 2. Direct customer property listings
  const directListings = await prisma.agentListing.findMany({
    where: { agentId: agentProfileId },
    include: { masterProperty: { select: { masterId: true, city: true, locality: true } } },
    orderBy: { listingExpiresAt: "asc" },
  });

  const formattedListings = directListings.map((l) => {
    const expiresAt = l.listingExpiresAt ?? new Date(l.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    const daysToExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      id: l.id,
      slug: l.slug,
      title: l.title,
      price: l.price,
      masterId: l.masterProperty.masterId,
      listingPlan: l.listingPlan,
      expiresAt,
      daysToExpiry,
      isExpired: daysToExpiry <= 0 || l.isDelisted,
      agreementExpiryDate: l.agreementExpiryDate,
    };
  });

  return {
    agents: formattedAgents,
    listings: formattedListings,
  };
}

/**
 * Evaluates all agents whose 60-day cycle has elapsed.
 * Promotes high-performing Basic agents to Prime,
 * Demotes inactive Prime agents to Basic,
 * Awards carry-forward incentive points, and resets rolling 60-day window.
 */
export async function evaluateAndRolloverCycles() {
  const now = new Date();
  const agents = await prisma.agentProfile.findMany({
    where: {
      status: "APPROVED",
      OR: [
        { cycleEndDate: { lte: now } },
        { cycleEndDate: null, cycleStartDate: { lte: new Date(now.getTime() - CYCLE_MS) } },
      ],
    },
    include: { user: true },
  });

  const results = [];

  for (const agent of agents) {
    const startDate = agent.cycleStartDate ?? agent.createdAt;
    const [listingsCount, dealsCount, visitsCount] = await Promise.all([
      prisma.agentListing.count({
        where: { agentId: agent.id, createdAt: { gte: startDate } },
      }),
      prisma.deal.count({
        where: {
          OR: [{ buyerAgentId: agent.id }, { sellerAgentId: agent.id }],
          status: { in: ["REGISTRY_COMPLETED", "CLOSED"] },
          createdAt: { gte: startDate },
        },
      }),
      prisma.propertyVisitLog.count({
        where: { agentId: agent.id, visitedAt: { gte: startDate } },
      }),
    ]);

    const isTargetMet =
      listingsCount >= agent.cycleListingsTarget &&
      (dealsCount >= agent.cycleDealsTarget || visitsCount >= agent.cycleVisitsTarget);

    let newPlanTier = agent.planTier;
    let newPrimeStatus = agent.primeStatus;
    let carryForwardIncrement = 0;

    if (isTargetMet) {
      // Met targets: Promote or Maintain Prime + Bonus score
      carryForwardIncrement = 100;
      if (agent.planTier === "BASIC") {
        newPlanTier = "PRIME";
        newPrimeStatus = true;
      }
      await notifyUser(
        agent.user,
        `Congratulations! You completed your 60-day target cycle (${listingsCount} listings, ${dealsCount} deals). You earned +100 carry-forward score points!`,
        "60-Day Target Cycle Achieved"
      );
    } else {
      // Failed targets: Demote Prime to Basic
      if (agent.planTier === "PRIME") {
        newPlanTier = "BASIC";
        newPrimeStatus = false;
        await notifyUser(
          agent.user,
          `Your 60-day target cycle expired without meeting the minimum activity threshold. Your membership tier has been changed to Basic. Complete upcoming targets to regain Prime!`,
          "60-Day Target Cycle Demotion"
        );
      }
    }

    const nextEndDate = new Date(now.getTime() + CYCLE_MS);

    await prisma.agentProfile.update({
      where: { id: agent.id },
      data: {
        planTier: newPlanTier,
        primeStatus: newPrimeStatus,
        carryForwardScore: { increment: carryForwardIncrement },
        cycleCompletedCount: isTargetMet ? { increment: 1 } : undefined,
        cycleStartDate: now,
        cycleEndDate: nextEndDate,
      },
    });

    results.push({
      agentId: agent.id,
      agentCode: agent.agentCode,
      isTargetMet,
      planTier: newPlanTier,
    });
  }

  return results;
}

/**
 * PDF 1 Page 7:
 * Generates a 20% Pre-Expiry Discount Coupon for listings or plan renewals within 48 hours of expiry.
 */
export async function issuePreExpiryDiscountCoupon(agentProfileId: string) {
  const agent = await prisma.agentProfile.findUnique({
    where: { id: agentProfileId },
    include: { user: true },
  });
  if (!agent) throw new TargetCycleError("Channel Partner not found");

  const now = new Date();
  const couponCode = `RENEW20-${agent.agentCode || agent.id.slice(-4)}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
  const couponExpiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 Hours validity

  await prisma.agentProfile.update({
    where: { id: agent.id },
    data: {
      activeDiscountCoupon: couponCode,
      couponExpiresAt,
    },
  });

  await notifyUser(
    agent.user,
    `Limited Offer! Your 20% Pre-Expiry Discount Coupon is: ${couponCode}. Valid for 48 hours. Renew now to save 20% and keep your 60-day cycle target streak active!`,
    "20% Renewal Discount Coupon Activated"
  );

  return {
    code: couponCode,
    discountPercent: 20,
    expiresAt: couponExpiresAt,
  };
}

/**
 * Validates and applies discount coupon
 */
export async function applyDiscountCoupon(agentProfileId: string, couponCode: string, amount: number) {
  const agent = await prisma.agentProfile.findUnique({
    where: { id: agentProfileId },
  });
  if (!agent) throw new TargetCycleError("Channel Partner not found");

  const now = new Date();
  if (
    !agent.activeDiscountCoupon ||
    agent.activeDiscountCoupon !== couponCode.trim().toUpperCase() ||
    !agent.couponExpiresAt ||
    agent.couponExpiresAt.getTime() < now.getTime()
  ) {
    throw new TargetCycleError("Invalid or expired coupon code");
  }

  const discountAmount = Math.round(amount * 0.20);
  const finalAmount = amount - discountAmount;

  return {
    valid: true,
    discountPercent: 20,
    discountAmount,
    finalAmount,
  };
}
