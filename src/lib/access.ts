import { prisma } from "@/lib/prisma";

/**
 * A buyer who has paid once (a listing unlock or a partner-shop unlock) can open every
 * listing in full — they do not pay again per property.
 */
export async function buyerHasPaidAccess(buyerId: string): Promise<boolean> {
  const [unlock, shop] = await Promise.all([
    prisma.propertyUnlock.findFirst({ where: { buyerId, amount: { gt: 0 } }, select: { id: true } }),
    prisma.agentShopUnlock.findFirst({ where: { buyerId, amount: { gt: 0 } }, select: { id: true } }),
  ]);
  return Boolean(unlock || shop);
}

/** True when this signed-in owner is the one who listed this property (their own plan already covers it). */
export async function ownerOwnsListing(ownerUserId: string, agentListingId: string): Promise<boolean> {
  const request = await prisma.listingRequest.findFirst({
    where: { userId: ownerUserId, agentListingId },
    select: { id: true },
  });
  return Boolean(request);
}

/** Whether the signed-in user may see the full details (address, partner contact) of a listing without paying. */
export async function canSeeFullListing(user: { id: string; role: string } | undefined | null, agentListingId: string) {
  if (!user) return false;
  if (user.role === "OWNER") return ownerOwnsListing(user.id, agentListingId);
  if (user.role === "BUYER") {
    const own = await prisma.propertyUnlock.findUnique({
      where: { agentListingId_buyerId: { agentListingId, buyerId: user.id } },
      select: { id: true },
    });
    return Boolean(own) || (await buyerHasPaidAccess(user.id));
  }
  return false;
}
