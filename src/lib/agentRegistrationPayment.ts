import { prisma } from "@/lib/prisma";
import { approveAgent, activateAgentPrime, AgentServiceError } from "@/lib/agent";
import { getAgentPlans } from "@/lib/agentPlans";
import {
  createRazorpayOrder,
  getRazorpayKeyId,
  isRazorpayConfigured,
  verifyPaidOrder,
} from "@/lib/razorpay";

// register = first-time membership (no Channel Partner Code yet)
// upgrade  = an already-active partner switching/renewing plan
export type PlanPaymentMode = "register" | "upgrade";

// The mode is baked into the order receipt, so a payment made for one purpose
// can't be replayed for the other.
const receiptPrefix = (mode: PlanPaymentMode, agentId: string) =>
  `${mode === "register" ? "agentreg" : "agentupg"}_${agentId}_`;

async function getPlan(planId: string) {
  const plan = (await getAgentPlans()).find((p) => p.id === planId);
  if (!plan) throw new AgentServiceError("planNotFound");
  return plan;
}

function assertEligible(mode: PlanPaymentMode, agent: { agentCode: string | null; status: string }) {
  if (mode === "register" && agent.agentCode) throw new AgentServiceError("alreadyActive");
  if (mode === "upgrade" && (!agent.agentCode || agent.status !== "APPROVED")) {
    throw new AgentServiceError("notVerified");
  }
}

export async function createPlanOrder(agentId: string, planId: string, mode: PlanPaymentMode) {
  const [plan, agent] = await Promise.all([
    getPlan(planId),
    prisma.agentProfile.findUnique({ where: { id: agentId } }),
  ]);
  if (!agent) throw new AgentServiceError("notFound");
  assertEligible(mode, agent);

  if (!isRazorpayConfigured()) throw new AgentServiceError("paymentUnavailable");
  const order = await createRazorpayOrder(plan.price, `${receiptPrefix(mode, agentId)}${Date.now()}`);
  if (!order) throw new AgentServiceError("paymentUnavailable");
  return {
    order,
    keyId: getRazorpayKeyId(),
    amount: plan.price,
    planName: plan.name,
  };
}

/**
 * Called after checkout. Verifies the payment really happened, for this agent
 * and this plan's price, then approves (if still pending) and activates the
 * plan — which mints the Channel Partner Code on first activation.
 */
export async function confirmPlanPayment(
  agentId: string,
  planId: string,
  mode: PlanPaymentMode,
  p: { razorpayOrderId?: string | null; razorpayPaymentId?: string | null; razorpaySignature?: string | null }
) {
  const plan = await getPlan(planId);

  const agent = await prisma.agentProfile.findUnique({ where: { id: agentId } });
  if (!agent) throw new AgentServiceError("notFound");
  assertEligible(mode, agent);

  if (!p.razorpayOrderId || !p.razorpayPaymentId || !p.razorpaySignature) {
    throw new AgentServiceError("paymentMissing");
  }
  const paid = await verifyPaidOrder({
    orderId: p.razorpayOrderId,
    paymentId: p.razorpayPaymentId,
    signature: p.razorpaySignature,
    amountRupees: plan.price,
    receiptPrefix: receiptPrefix(mode, agentId),
  });
  if (!paid) throw new AgentServiceError("paymentInvalid");

  const paymentId = p.razorpayPaymentId;
  if (await prisma.subscription.findUnique({ where: { razorpayPaymentId: paymentId } })) {
    throw new AgentServiceError("paymentAlreadyUsed");
  }

  if (agent.status !== "APPROVED") await approveAgent(agentId);
  return activateAgentPrime(agentId, planId, paymentId);
}

// Back-compat names used by the registration form.
export const createRegistrationOrder = (agentId: string, planId: string) =>
  createPlanOrder(agentId, planId, "register");
export const confirmRegistrationPayment = (
  agentId: string,
  planId: string,
  p: Parameters<typeof confirmPlanPayment>[3]
) => confirmPlanPayment(agentId, planId, "register", p);
