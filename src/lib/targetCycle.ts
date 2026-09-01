import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";

export class TargetCycleError extends Error {}

const CYCLE_DURATION_DAYS = 60;
const CYCLE_MS = CYCLE_DURATION_DAYS * 24 * 60 * 60 * 1000;

export async function getAgentCycleProgress(agentProfileId: string) {
  const agent = await prisma.agentProfile.findUnique({
    where: { id: agentProfileId },
    include: { user: true },
  });
  if (!agent) throw new TargetCycleError("Agent not found");

  const now = new Date();
  const startDate = agent.cycleStartDate ?? agent.createdAt;
  const endDate = agent.cycleEndDate ?? new Date(startDate.getTime() + CYCLE_MS);

  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  // Count activity during current 60-day cycle
  const [listingsCount, dealsCount, visitsCount] = await Promise.all([
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
  ]);

  const targetListings = agent.cycleListingsTarget;
  const targetDeals = agent.cycleDealsTarget;
  const targetVisits = agent.cycleVisitsTarget;

  const isTargetMet = listingsCount >= targetListings && (dealsCount >= targetDeals || visitsCount >= targetVisits);

  const isCouponActive =
    Boolean(agent.activeDiscountCoupon) &&
    Boolean(agent.couponExpiresAt && agent.couponExpiresAt.getTime() > now.getTime());

  return {
    cycleStartDate: startDate,
    cycleEndDate: endDate,
    daysRemaining,
    planTier: agent.planTier,
    targets: {
      listings: targetListings,
      deals: targetDeals,
      visits: targetVisits,
    },
    achieved: {
      listings: listingsCount,
      deals: dealsCount,
      visits: visitsCount,
    },
    isTargetMet,
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
  if (!agent) throw new TargetCycleError("Agent not found");

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
  if (!agent) throw new TargetCycleError("Agent not found");

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
