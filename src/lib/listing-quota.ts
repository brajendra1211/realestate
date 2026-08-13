import { prisma } from "@/lib/prisma";

// Baseline free-tier listing caps — used whenever a lister has no active paid plan.
export const FREE_LISTING_LIMITS: Record<string, number> = {
  OWNER: 3,
  DEALER: 10,
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
  const [used, limit] = await Promise.all([
    prisma.property.count({ where: { ownerId: userId, approvalStatus: { not: "REJECTED" } } }),
    getListingLimit(userId, role),
  ]);
  return { used, limit, remaining: Math.max(limit - used, 0), atLimit: used >= limit };
}
