import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";

export class UnlockServiceError extends Error {}

const UNLOCK_AMOUNT = 100;
const AGENT_SPLIT = 50;
const COMPANY_SPLIT = 50;

// No payment gateway is wired in yet (docs/platform-requirements.md §5 schedules
// Razorpay for Phase 3, "Money Automation"). This function is the single seam to
// swap a real payment capture into later — everything downstream of "payment
// succeeded" (split-credit, reveal, notify) is already the real implementation.
export async function unlockAgentListing(buyerId: string, agentListingId: string) {
  const existing = await prisma.propertyUnlock.findUnique({
    where: { agentListingId_buyerId: { agentListingId, buyerId } },
  });
  if (existing) return existing;

  const listing = await prisma.agentListing.findUnique({
    where: { id: agentListingId },
    include: { agent: { include: { user: { select: { phone: true, email: true } } } } },
  });
  if (!listing) throw new UnlockServiceError("notFound");

  const [unlock] = await prisma.$transaction([
    prisma.propertyUnlock.create({
      data: {
        agentListingId,
        buyerId,
        amount: UNLOCK_AMOUNT,
        agentSplit: AGENT_SPLIT,
        companySplit: COMPANY_SPLIT,
      },
    }),
    prisma.commissionLedgerEntry.create({
      data: {
        agentId: listing.agentId,
        type: "UNLOCK_SPLIT",
        amount: AGENT_SPLIT,
        refId: agentListingId,
        note: `50% of ₹${UNLOCK_AMOUNT} unlock pass for listing "${listing.title}"`,
      },
    }),
    prisma.agentProfile.update({
      where: { id: listing.agentId },
      data: { walletBalance: { increment: AGENT_SPLIT } },
    }),
  ]);

  await notifyUser(
    listing.agent.user,
    `Your listing "${listing.title}" was unlocked by a customer. ₹${AGENT_SPLIT} has been credited to your wallet.`,
    "Listing unlocked — wallet credited"
  );

  return unlock;
}

export async function getUnlockForBuyer(buyerId: string, agentListingId: string) {
  return prisma.propertyUnlock.findUnique({
    where: { agentListingId_buyerId: { agentListingId, buyerId } },
  });
}
