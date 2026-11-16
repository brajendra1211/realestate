import { prisma } from "@/lib/prisma";

// Baseline free-tier listing caps — 0 free listings allowed for anyone (paid plan mandatory)
export const FREE_LISTING_LIMITS: Record<string, number> = {
  OWNER: 0,
  DEALER: 0,
  AGENT: 0,
};

export async function getActiveSubscription(userId: string) {
  return prisma.subscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
    },
    include: { plan: true },
    orderBy: { plan: { listingLimit: "desc" } },
  });
}

export async function getListingLimit(userId: string, role: string) {
  if (role === "ADMIN" || role === "SUBADMIN") return Infinity;
  const activeSubscription = await getActiveSubscription(userId);
  return activeSubscription?.plan.listingLimit ?? FREE_LISTING_LIMITS[role] ?? 0;
}

export async function getListingUsage(userId: string, role: string) {
  if (role === "ADMIN" || role === "SUBADMIN") {
    return { used: 0, limit: Infinity, remaining: Infinity, atLimit: false };
  }

  const activeSubscription = await getActiveSubscription(userId);
  const limit = activeSubscription?.plan.listingLimit ?? FREE_LISTING_LIMITS[role] ?? 0;

  // If no active subscription, owner cannot list any properties
  if (!activeSubscription) {
    return { used: 0, limit: 0, remaining: 0, atLimit: true };
  }

  // Count only properties created during this active subscription cycle
  const cycleStart = activeSubscription.startDate ?? activeSubscription.createdAt;
  const used = await prisma.property.count({
    where: {
      ownerId: userId,
      approvalStatus: { not: "REJECTED" },
      createdAt: { gte: cycleStart },
    },
  });

  return { used, limit, remaining: Math.max(limit - used, 0), atLimit: used >= limit };
}
