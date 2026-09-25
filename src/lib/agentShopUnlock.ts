import { prisma } from "@/lib/prisma";
import {
  createRazorpayOrder,
  isRazorpayConfigured,
  getRazorpayKeyId,
  verifyRazorpayPaymentSignature,
  type RazorpayOrder,
} from "@/lib/razorpay";

export const AGENT_SHOP_UNLOCK_FEE = 50; // ₹50 access fee to view agent's verified inventory

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

  return Boolean(existing);
}

/**
 * Creates a ₹50 Razorpay order for unlocking an Agent's shop & inventory.
 */
export async function createAgentShopUnlockOrder(
  agentCode: string,
  buyerId?: string | null,
  customerPhone?: string | null
): Promise<{
  alreadyUnlocked: boolean;
  order: RazorpayOrder | null;
  keyId: string | null;
  simulated: boolean;
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

  const alreadyUnlocked = await isAgentShopUnlocked(agent.id, buyerId, customerPhone);
  if (alreadyUnlocked) {
    return {
      alreadyUnlocked: true,
      order: null,
      keyId: null,
      simulated: false,
      amount: AGENT_SHOP_UNLOCK_FEE,
      agentCode: code,
    };
  }

  const keyId = getRazorpayKeyId();
  const simulated = !isRazorpayConfigured();

  if (simulated) {
    return {
      alreadyUnlocked: false,
      order: null,
      keyId: null,
      simulated: true,
      amount: AGENT_SHOP_UNLOCK_FEE,
      agentCode: code,
    };
  }

  const receipt = `shop_${code}_${Date.now()}`;
  const order = await createRazorpayOrder(AGENT_SHOP_UNLOCK_FEE, receipt);

  return {
    alreadyUnlocked: false,
    order,
    keyId,
    simulated: false,
    amount: AGENT_SHOP_UNLOCK_FEE,
    agentCode: code,
  };
}

/**
 * Verifies Razorpay payment signature and records the ₹50 unlock in database.
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
    select: { id: true, agentCode: true },
  });

  if (!agent) {
    throw new AgentShopUnlockError("Channel Partner not found");
  }

  // If Razorpay is live, verify the payment signature
  if (isRazorpayConfigured()) {
    if (!input.razorpayOrderId || !input.razorpayPaymentId || !input.razorpaySignature) {
      throw new AgentShopUnlockError("Missing payment credentials");
    }

    const isValid = verifyRazorpayPaymentSignature(
      input.razorpayOrderId,
      input.razorpayPaymentId,
      input.razorpaySignature
    );

    if (!isValid) {
      throw new AgentShopUnlockError("Invalid payment signature");
    }
  }

  const cleanPhone = input.customerPhone
    ? input.customerPhone.replace(/[^0-9]/g, "").slice(-10)
    : null;

  // Record unlock
  return prisma.agentShopUnlock.create({
    data: {
      agentId: agent.id,
      buyerId: input.buyerId || null,
      customerPhone: cleanPhone,
      amount: AGENT_SHOP_UNLOCK_FEE,
      razorpayOrderId: input.razorpayOrderId || null,
      razorpayPaymentId: input.razorpayPaymentId || null,
    },
  });
}
