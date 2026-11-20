import { prisma } from "@/lib/prisma";
import { canAutoCredit } from "@/lib/commissionMode";
import { computeSplit } from "@/lib/commission";
import { notifyUser } from "@/lib/notify";
import { getSiteSettings } from "@/lib/site-settings";
import {
  createRazorpayOrder,
  isRazorpayConfigured,
  getRazorpayKeyId,
  verifyPaidOrder,
  type RazorpayOrder,
} from "@/lib/razorpay";

// The QR "shop unlock" costs the same as the unlock pass (admin setting, default ₹100) and is
// split with the channel partner the same way (default 50/50): half to the partner's wallet,
// half stays with the company.
export async function getAgentShopUnlockFee() {
  return (await getSiteSettings()).unlockPassAmount;
}

export class AgentShopUnlockError extends Error {}

/**
 * Checks if a buyer or customer phone has unlocked this agent's shop and properties.
 */
export async function isAgentShopUnlocked(
  agentProfileId: string,
  buyerId?: string | null,
  customerPhone?: string | null
): Promise<boolean> {
  const conditions: { buyerId?: string; customerPhone?: string }[] = [];

  if (buyerId) {
    conditions.push({ buyerId });
  }

  if (customerPhone) {
    const cleanPhone = customerPhone.replace(/[^0-9]/g, "").slice(-10);
    if (cleanPhone) {
      conditions.push({ customerPhone: cleanPhone });
    }
  }

  if (conditions.length === 0) {
    return false;
  }

  const existing = await prisma.agentShopUnlock.findFirst({
    where: {
      agentId: agentProfileId,
      OR: conditions,
    },
  });
  if (existing) return true;

  // A buyer who already paid the unlock fee for one of this partner's listings, or whose
  // buyer request this partner accepted, can see ALL of the partner's listings — that is
  // what the partner's shop link is for.
  if (buyerId) {
    const [paid, accepted] = await Promise.all([
      prisma.propertyUnlock.findFirst({
        where: { buyerId, OR: [{ assignedAgentId: agentProfileId }, { agentListing: { agentId: agentProfileId } }] },
        select: { id: true },
      }),
      prisma.buyerInterestAcceptance.findFirst({
        where: { agentId: agentProfileId, interest: { buyerId } },
        select: { id: true },
      }),
    ]);
    if (paid || accepted) return true;
  }

  return false;
}

/**
 * Creates the Razorpay order for unlocking an Agent's shop & inventory.
 */
export async function createAgentShopUnlockOrder(
  agentCode: string,
  buyerId?: string | null,
  customerPhone?: string | null
): Promise<{
  alreadyUnlocked: boolean;
  order: RazorpayOrder | null;
  keyId: string | null;
  amount: number;
  agentCode: string;
}> {
  const code = agentCode.trim().toUpperCase();
  const agent = await prisma.agentProfile.findFirst({
    where: { agentCode: code },
    select: { id: true, agentCode: true },
  });

  if (!agent) {
    throw new AgentShopUnlockError("Channel Partner not found");
  }

  const fee = await getAgentShopUnlockFee();
  const alreadyUnlocked = await isAgentShopUnlocked(agent.id, buyerId, customerPhone);
  if (alreadyUnlocked) {
    return {
      alreadyUnlocked: true,
      order: null,
      keyId: null,
      amount: fee,
      agentCode: code,
    };
  }

  if (!isRazorpayConfigured()) {
    throw new AgentShopUnlockError("Online payment is not set up yet. Please try again later.");
  }
  const keyId = getRazorpayKeyId();

  const receipt = `shop_${code}_${Date.now()}`;
  const order = await createRazorpayOrder(fee, receipt);

  return {
    alreadyUnlocked: false,
    order,
    keyId,
    amount: fee,
    agentCode: code,
  };
}

/**
 * Verifies the Razorpay payment, records the unlock and credits the partner's share.
 */
export async function verifyAndUnlockAgentShop(input: {
  agentCode: string;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  razorpaySignature?: string | null;
  buyerId?: string | null;
  customerPhone?: string | null;
}) {
  const code = input.agentCode.trim().toUpperCase();
  const agent = await prisma.agentProfile.findFirst({
    where: { agentCode: code },
    select: { id: true, agentCode: true, user: { select: { phone: true, email: true } } },
  });

  if (!agent) {
    throw new AgentShopUnlockError("Channel Partner not found");
  }

  const settings = await getSiteSettings();
  const fee = settings.unlockPassAmount;

  // Always verify the payment: there is no unpaid path.
  if (!input.razorpayOrderId || !input.razorpayPaymentId || !input.razorpaySignature) {
    throw new AgentShopUnlockError("Missing payment credentials");
  }
  const isValid = await verifyPaidOrder({
    orderId: input.razorpayOrderId,
    paymentId: input.razorpayPaymentId,
    signature: input.razorpaySignature,
    amountRupees: fee,
    receiptPrefix: `shop_${code}_`,
  });
  if (!isValid) {
    throw new AgentShopUnlockError("Invalid payment signature");
  }
  // One payment unlocks once, however often this is replayed.
  const dup = await prisma.agentShopUnlock.findFirst({ where: { razorpayPaymentId: input.razorpayPaymentId } });
  if (dup) return dup;

  const cleanPhone = input.customerPhone
    ? input.customerPhone.replace(/[^0-9]/g, "").slice(-10)
    : null;

  // Record the unlock and, in one transaction, credit the partner's share to their wallet.
  const { agentSplit } = computeSplit(fee, settings.unlockAgentSplitPercent);
  const autoCredit = await canAutoCredit("UNLOCK_SPLIT", agent.id);

  const unlock = await prisma.agentShopUnlock.create({
    data: {
      agentId: agent.id,
      buyerId: input.buyerId || null,
      customerPhone: cleanPhone,
      amount: fee,
      razorpayOrderId: input.razorpayOrderId || null,
      razorpayPaymentId: input.razorpayPaymentId || null,
    },
  });

  if (autoCredit && agentSplit > 0) {
    await prisma.$transaction([
      prisma.commissionLedgerEntry.create({
        data: {
          agentId: agent.id,
          type: "UNLOCK_SPLIT",
          amount: agentSplit,
          refId: unlock.id,
          note: `${settings.unlockAgentSplitPercent}% of ₹${fee} shop QR unlock`,
        },
      }),
      prisma.agentProfile.update({
        where: { id: agent.id },
        data: { walletBalance: { increment: agentSplit } },
      }),
    ]);
    await notifyUser(
      agent.user,
      `A customer unlocked your shop with your QR code. ₹${agentSplit} has been credited to your wallet.`,
      "Shop unlocked — wallet credited"
    );
  }

  return unlock;
}
