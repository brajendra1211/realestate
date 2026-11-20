import { prisma } from "@/lib/prisma";
import { getAgentPlans } from "@/lib/agentPlans";

// Upgrading to a higher plan does not waste what the partner already paid for.
// The unused value of the current plan is converted into days of the new plan at the new
// plan's daily rate. Prime costs more per day, so the same value buys fewer days, and no
// payment is taken. Example: 20 days left on Basic (₹999 for 30 days = ₹666 of value) become
// about 10 days of Prime (₹1,999 for 30 days).

export class PlanConversionError extends Error {}

const DAY_MS = 24 * 60 * 60 * 1000;

export type PlanConversionPreview = {
  fromPlanName: string;
  toPlanId: string;
  toPlanName: string;
  remainingDays: number;
  remainingValue: number;
  newDays: number;
  newEndDate: Date;
};

async function load(agentProfileId: string, toPlanId: string) {
  const agent = await prisma.agentProfile.findUnique({ where: { id: agentProfileId } });
  if (!agent || agent.status !== "APPROVED" || !agent.agentCode) throw new PlanConversionError("notEligible");

  const sub = await prisma.subscription.findFirst({
    where: { userId: agent.userId, status: "ACTIVE", endDate: { gt: new Date() } },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
  if (!sub || !sub.endDate) throw new PlanConversionError("noActivePlan");

  const target = (await getAgentPlans()).find((p) => p.id === toPlanId);
  if (!target) throw new PlanConversionError("planNotFound");
  if (target.id === sub.planId) throw new PlanConversionError("samePlan");

  const fromDays = sub.plan.durationDays ?? 30;
  const fromPerDay = (sub.amount ?? sub.plan.price) / fromDays;
  const toPerDay = target.price / target.durationDays;
  // Only an upgrade (a higher daily rate) is converted this way.
  if (toPerDay <= fromPerDay) throw new PlanConversionError("notAnUpgrade");

  const remainingDays = Math.max(0, (sub.endDate.getTime() - Date.now()) / DAY_MS);
  const remainingValue = Math.round(remainingDays * fromPerDay);
  const newDays = Math.round(remainingValue / toPerDay);
  if (newDays < 1) throw new PlanConversionError("tooLittleLeft");

  return { agent, sub, target, remainingDays, remainingValue, newDays };
}

export async function previewPlanConversion(agentProfileId: string, toPlanId: string): Promise<PlanConversionPreview | null> {
  try {
    const { sub, target, remainingDays, remainingValue, newDays } = await load(agentProfileId, toPlanId);
    return {
      fromPlanName: sub.plan.name,
      toPlanId: target.id,
      toPlanName: target.name,
      remainingDays: Math.round(remainingDays),
      remainingValue,
      newDays,
      newEndDate: new Date(Date.now() + newDays * DAY_MS),
    };
  } catch (error) {
    if (error instanceof PlanConversionError) return null;
    throw error;
  }
}

export async function convertPlan(agentProfileId: string, toPlanId: string) {
  const { agent, sub, target, newDays } = await load(agentProfileId, toPlanId);
  const now = new Date();

  // Amount is 0 on purpose: no new money came in, so revenue is not counted twice.
  await prisma.$transaction([
    prisma.subscription.update({ where: { id: sub.id }, data: { status: "CANCELLED" } }),
    prisma.subscription.create({
      data: {
        userId: agent.userId,
        planId: target.id,
        status: "ACTIVE",
        amount: 0,
        startDate: now,
        endDate: new Date(now.getTime() + newDays * DAY_MS),
      },
    }),
    prisma.agentProfile.update({
      where: { id: agent.id },
      data: {
        planTier: target.tier,
        primeStatus: true,
        visibilityDeprioritized: false,
        renewalAlertSentAt: null,
      },
    }),
  ]);
  return { newDays };
}
