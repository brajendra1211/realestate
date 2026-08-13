import { prisma } from "@/lib/prisma";
import { getActiveSubscription } from "@/lib/listing-quota";

// Baseline free-tier lead-reveal caps — used whenever a lister has no active paid plan.
export const FREE_LEAD_LIMITS: Record<string, number> = {
  OWNER: 5,
  DEALER: 15,
};

export async function getLeadLimit(userId: string, role: string) {
  if (role === "ADMIN" || role === "SUBADMIN") return Infinity;
  const activeSubscription = await getActiveSubscription(userId);
  if (activeSubscription && activeSubscription.plan.leadLimit === null) return Infinity;
  return activeSubscription?.plan.leadLimit ?? FREE_LEAD_LIMITS[role] ?? 0;
}

export async function getLeadUsage(userId: string, role: string) {
  const [used, limit] = await Promise.all([
    prisma.leadView.count({ where: { userId } }),
    getLeadLimit(userId, role),
  ]);
  return { used, limit, remaining: Math.max(limit - used, 0), atLimit: used >= limit };
}
