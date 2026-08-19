import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";
import { createRazorpayOrder, isRazorpayConfigured, verifyRazorpayPaymentSignature } from "@/lib/razorpay";
import { computeSplit } from "@/lib/commission";
import { getSiteSettings } from "@/lib/site-settings";
import type { Prisma } from "@/generated/prisma";

export class UnlockServiceError extends Error {}

// The real-payment seam, now wired: if RAZORPAY_KEY_ID/SECRET are set, this
// creates a real order and the caller (Server Action) opens Razorpay Checkout
// client-side; verifyAndUnlockListing below checks the signature before
// crediting anything. Without keys configured, returns order: null and the
// caller falls back to the pre-existing simulated/instant unlockAgentListing.
export async function createUnlockOrder(buyerId: string, agentListingId: string) {
  const existing = await prisma.propertyUnlock.findUnique({
    where: { agentListingId_buyerId: { agentListingId, buyerId } },
  });
  if (existing) return { alreadyUnlocked: true as const };

  if (!isRazorpayConfigured()) return { alreadyUnlocked: false as const, order: null };

  const listing = await prisma.agentListing.findUnique({ where: { id: agentListingId } });
  if (!listing) throw new UnlockServiceError("notFound");

  const settings = await getSiteSettings();
  const order = await createRazorpayOrder(settings.unlockPassAmount, `unlock_${agentListingId}_${buyerId}`);
  return { alreadyUnlocked: false as const, order };
}

export async function verifyAndUnlockListing(
  buyerId: string,
  agentListingId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
) {
  const valid = verifyRazorpayPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!valid) throw new UnlockServiceError("invalidSignature");

  return unlockAgentListing(buyerId, agentListingId);
}

// Idempotent unlock: records the payment split and reveals the listing.
// Called either directly (simulated flow, no Razorpay keys configured) or
// via verifyAndUnlockListing above once a real payment's signature checks out.
//
// A Gold self-listing (§3.4) with no referring agent has `agentId: null` —
// there's no agent to credit or notify in that case, so the split is
// skipped and the full amount is implicitly the company's (companySplit
// still records 50 for consistency with every other listing's row shape,
// but no CommissionLedgerEntry/wallet credit is created).
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

  const settings = await getSiteSettings();
  const { agentSplit, companySplit } = computeSplit(settings.unlockPassAmount, settings.unlockAgentSplitPercent);

  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.propertyUnlock.create({
      data: {
        agentListingId,
        buyerId,
        amount: settings.unlockPassAmount,
        agentSplit: listing.agentId ? agentSplit : 0,
        companySplit: listing.agentId ? companySplit : settings.unlockPassAmount,
      },
    }),
  ];

  if (listing.agentId) {
    ops.push(
      prisma.commissionLedgerEntry.create({
        data: {
          agentId: listing.agentId,
          type: "UNLOCK_SPLIT",
          amount: agentSplit,
          refId: agentListingId,
          note: `${settings.unlockAgentSplitPercent}% of ₹${settings.unlockPassAmount} unlock pass for listing "${listing.title}"`,
        },
      }),
      prisma.agentProfile.update({
        where: { id: listing.agentId },
        data: { walletBalance: { increment: agentSplit } },
      })
    );
  }

  const [unlock] = (await prisma.$transaction(ops)) as [Awaited<ReturnType<typeof prisma.propertyUnlock.create>>, ...unknown[]];

  if (listing.agentId && listing.agent) {
    await notifyUser(
      listing.agent.user,
      `Your listing "${listing.title}" was unlocked by a customer. ₹${agentSplit} has been credited to your wallet.`,
      "Listing unlocked — wallet credited"
    );
  }

  return unlock;
}

export async function getUnlockForBuyer(buyerId: string, agentListingId: string) {
  return prisma.propertyUnlock.findUnique({
    where: { agentListingId_buyerId: { agentListingId, buyerId } },
  });
}
