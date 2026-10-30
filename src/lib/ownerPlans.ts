import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";

export const DEFAULT_OWNER_PLANS = [
  {
    name: "Owner Basic Plan (1 Month)",
    role: "OWNER" as const,
    price: 200,
    durationDays: 30,
    listingLimit: 1,
    leadLimit: 10,
    description: "1 Month verified property listing with direct buyer enquiries",
  },
  {
    name: "Owner Gold Plan (3 Months)",
    role: "OWNER" as const,
    price: 500,
    durationDays: 90,
    listingLimit: 3,
    leadLimit: 50,
    description: "3 Months extended property listing with priority agent broadcast & verified buyer leads",
  },
];

/**
 * Ensures standard Basic (₹200 / 1 mo) and Gold (₹500 / 3 mo) owner plans exist in the DB.
 * Deactivates any 0-price free plans so free listings are impossible.
 */
export async function ensureDefaultOwnerPlans() {
  const settings = await getSiteSettings();
  const basicFee = settings.basicListingFee ?? 200;
  const goldFee = settings.goldListingFee ?? 500;

  // Deactivate any legacy free owner plans
  await prisma.plan.updateMany({
    where: { price: 0, role: { in: ["OWNER", "BOTH"] } },
    data: { active: false },
  });

  const plans = await Promise.all(
    DEFAULT_OWNER_PLANS.map(async (def) => {
      const price = def.durationDays === 90 ? goldFee : basicFee;
      const targetId = def.durationDays === 90 ? "plan-owner-gold" : "plan-owner-basic";
      const existing = await prisma.plan.findFirst({
        where: { OR: [{ id: targetId }, { name: def.name, role: "OWNER" }] },
      });
      if (existing) {
        return prisma.plan.update({
          where: { id: existing.id },
          data: {
            id: targetId,
            name: def.name,
            price,
            durationDays: def.durationDays,
            listingLimit: def.listingLimit,
            active: true,
          },
        });
      }
      return prisma.plan.create({
        data: {
          id: targetId,
          name: def.name,
          role: "OWNER",
          price,
          durationDays: def.durationDays,
          listingLimit: def.listingLimit,
          leadLimit: def.leadLimit,
          active: true,
        },
      });
    })
  );

  return plans;
}

export async function getOwnerPlans() {
  const [settings] = await Promise.all([
    getSiteSettings(),
    ensureDefaultOwnerPlans(),
  ]);

  const dbPlans = await prisma.plan.findMany({
    where: { role: { in: ["OWNER", "BOTH"] }, active: true, price: { gt: 0 } },
    orderBy: { price: "asc" },
  });

  return dbPlans.map((p) => {
    const isGold = (p.durationDays ?? 30) >= 60 || p.name.toLowerCase().includes("gold");
    return {
      ...p,
      isGold,
      effectivePrice: isGold ? settings.goldListingFee : settings.basicListingFee,
      effectiveDurationDays: isGold ? 90 : 30,
    };
  });
}

/**
 * Activates an Owner Listing Plan for an owner/dealer user:
 * Sets active subscription for 30 days (Basic) or 90 days (Gold).
 */
export async function activateOwnerPlan(userId: string, planTier: "BASIC" | "GOLD") {
  await ensureDefaultOwnerPlans();
  const settings = await getSiteSettings();
  const isGold = planTier === "GOLD";
  const durationDays = isGold ? 90 : 30;
  const fee = isGold ? settings.goldListingFee : settings.basicListingFee;

  const targetPlan = await prisma.plan.findFirst({
    where: {
      role: { in: ["OWNER", "BOTH"] },
      active: true,
      durationDays: isGold ? 90 : 30,
    },
    orderBy: { createdAt: "desc" },
  }) ?? await prisma.plan.findFirst({
    where: { role: { in: ["OWNER", "BOTH"] }, active: true },
    orderBy: { price: isGold ? "desc" : "asc" },
  });

  if (!targetPlan) {
    throw new Error("Owner listing plan not found");
  }

  const now = new Date();
  const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // Expire or cancel any existing active subscriptions for this user to avoid overlapping limits
  await prisma.subscription.updateMany({
    where: { userId, status: "ACTIVE" },
    data: { status: "EXPIRED" },
  });

  const subscription = await prisma.subscription.create({
    data: {
      userId,
      planId: targetPlan.id,
      status: "ACTIVE",
      amount: fee,
      startDate: now,
      endDate,
    },
    include: { plan: true },
  });

  return subscription;
}
