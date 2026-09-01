import { prisma } from "@/lib/prisma";
import type { AgentPlanTier } from "@/generated/prisma";

export interface AgentPlanDefinition {
  id: string;
  name: string;
  tier: AgentPlanTier;
  price: number;
  durationDays: number;
  splitPercent: number;
  referralAmount: number;
  companyAmount: number;
  listingLimit: number;
}

export const DEFAULT_AGENT_PLANS = [
  {
    name: "Agent Basic Plan",
    tier: "BASIC" as AgentPlanTier,
    price: 1000,
    durationDays: 30,
    listingLimit: 10,
    description: "Basic monthly agent code membership with standard listing limits",
  },
  {
    name: "Agent Prime Plan",
    tier: "PRIME" as AgentPlanTier,
    price: 2000,
    durationDays: 30,
    listingLimit: 50,
    description: "Prime monthly agent membership with high priority and B2B broadcast access",
  },
];

/**
 * Ensures standard Basic (₹1,000) and Prime (₹2,000) agent plans exist in the DB.
 */
export async function ensureDefaultAgentPlans() {
  const plans = await Promise.all(
    DEFAULT_AGENT_PLANS.map(async (def) => {
      const existing = await prisma.plan.findFirst({
        where: { name: def.name, role: "AGENT" },
      });
      if (existing) return existing;
      return prisma.plan.create({
        data: {
          name: def.name,
          role: "AGENT",
          price: def.price,
          durationDays: def.durationDays,
          listingLimit: def.listingLimit,
          active: true,
        },
      });
    })
  );
  return plans;
}

/**
 * Get available agent plans with split breakdowns per PDF 1 Page 1:
 * - Basic Plan: ₹1,000 / month (₹500 agent wallet split, ₹500 company)
 * - Prime Plan: ₹2,000 / month (₹1,000 agent wallet split, ₹1,000 company)
 */
export async function getAgentPlans(): Promise<AgentPlanDefinition[]> {
  await ensureDefaultAgentPlans();
  const dbPlans = await prisma.plan.findMany({
    where: { role: { in: ["AGENT", "BOTH"] }, active: true },
    orderBy: { price: "asc" },
  });

  return dbPlans.map((p) => {
    const tier: AgentPlanTier = p.price <= 1000 ? "BASIC" : "PRIME";
    const splitPercent = 50; // PDF 1 Page 1: 50-50 split
    const referralAmount = Math.round(p.price * (splitPercent / 100));
    const companyAmount = p.price - referralAmount;

    return {
      id: p.id,
      name: p.name,
      tier,
      price: p.price,
      durationDays: p.durationDays ?? 30,
      splitPercent,
      referralAmount,
      companyAmount,
      listingLimit: p.listingLimit,
    };
  });
}

/**
 * Register or update an Agent's UPI / Google Pay Auto-Pay Mandate
 * (PDF 2 Page 1: Wallet insufficient balance fallback).
 */
export async function setAgentAutoPayMandate(agentProfileId: string, mandateVpa: string) {
  const cleanVpa = mandateVpa.trim();
  if (!cleanVpa || !cleanVpa.includes("@")) {
    throw new Error("Invalid UPI VPA format for Auto-Pay mandate");
  }

  return prisma.agentProfile.update({
    where: { id: agentProfileId },
    data: {
      autoPayMandate: cleanVpa,
      autoPayActive: true,
    },
  });
}

/**
 * Retrieve comprehensive agent subscription status including:
 * - Plan tier (Basic / Prime)
 * - Days remaining to renewal
 * - 5-day renewal warning alert status
 * - Auto-Pay mandate details
 * - Visibility pushback status (unrenewed penalty)
 */
export async function getAgentSubscriptionStatus(agentProfileId: string) {
  const agent = await prisma.agentProfile.findUnique({
    where: { id: agentProfileId },
    include: {
      user: {
        include: {
          subscriptions: {
            where: { status: "ACTIVE" },
            include: { plan: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });
  if (!agent) return null;

  const currentSub = agent.user.subscriptions[0] ?? null;
  const now = new Date();
  let daysRemaining = 0;
  let renewalAlertActive = false;

  if (currentSub?.endDate) {
    const diffMs = currentSub.endDate.getTime() - now.getTime();
    daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    // PDF 2 Page 1: 5 days pehle hi renewal alert show aa jayega
    if (daysRemaining <= 5 && agent.walletBalance < (currentSub.plan.price ?? 2000)) {
      renewalAlertActive = true;
    }
  }

  return {
    agentCode: agent.agentCode,
    primeStatus: agent.primeStatus,
    planTier: agent.planTier,
    visibilityDeprioritized: agent.visibilityDeprioritized,
    walletBalance: agent.walletBalance,
    autoPayActive: agent.autoPayActive,
    autoPayMandate: agent.autoPayMandate,
    currentSubscription: currentSub
      ? {
          id: currentSub.id,
          planName: currentSub.plan.name,
          planPrice: currentSub.plan.price,
          startDate: currentSub.startDate,
          endDate: currentSub.endDate,
        }
      : null,
    daysRemaining,
    renewalAlertActive,
  };
}
