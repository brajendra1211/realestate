import { prisma } from "@/lib/prisma";
import { ensureDefaultOwnerPlans } from "@/lib/ownerPlans";
import {
  createRazorpayOrder,
  getRazorpayKeyId,
  isRazorpayConfigured,
  verifyPaidOrder,
} from "@/lib/razorpay";

export class PlanPurchaseError extends Error {}

const receiptPrefix = (userId: string, planId: string) => `plan_${userId}_${planId}_`;

async function loadPlan(user: { id: string; role: string }, planId: string) {
  await ensureDefaultOwnerPlans();
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.active) throw new PlanPurchaseError("planNotFound");
  const allowed = plan.role === "BOTH" || plan.role === user.role || user.role === "ADMIN";
  if (!allowed || plan.role === "AGENT") throw new PlanPurchaseError("planNotAllowed");
  return plan;
}

/** Owner / dealer plan checkout: create the Razorpay order for this plan. */
export async function createPlanPurchaseOrder(user: { id: string; role: string }, planId: string) {
  const plan = await loadPlan(user, planId);
  if (!isRazorpayConfigured()) throw new PlanPurchaseError("paymentUnavailable");
  const order = await createRazorpayOrder(plan.price, `${receiptPrefix(user.id, planId)}${Date.now()}`);
  if (!order) throw new PlanPurchaseError("paymentUnavailable");
  return { order, keyId: getRazorpayKeyId(), planName: plan.name, amount: plan.price };
}

/** Verifies the payment, then activates the plan. No admin approval step. */
export async function confirmPlanPurchase(
  user: { id: string; role: string },
  planId: string,
  p: { razorpayOrderId?: string | null; razorpayPaymentId?: string | null; razorpaySignature?: string | null }
) {
  const plan = await loadPlan(user, planId);

  const ok = await verifyPaidOrder({
    orderId: p.razorpayOrderId,
    paymentId: p.razorpayPaymentId,
    signature: p.razorpaySignature,
    amountRupees: plan.price,
    receiptPrefix: receiptPrefix(user.id, planId),
  });
  if (!ok) throw new PlanPurchaseError("paymentInvalid");
  const paymentId = p.razorpayPaymentId!;
  if (await prisma.subscription.findUnique({ where: { razorpayPaymentId: paymentId } })) {
    throw new PlanPurchaseError("paymentAlreadyUsed");
  }

  const now = new Date();
  const [, subscription] = await prisma.$transaction([
    prisma.subscription.updateMany({
      where: { userId: user.id, status: { in: ["ACTIVE", "PENDING"] } },
      data: { status: "CANCELLED" },
    }),
    prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        status: "ACTIVE",
        amount: plan.price,
        razorpayPaymentId: paymentId,
        startDate: now,
        endDate: plan.durationDays ? new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000) : null,
      },
    }),
  ]);
  return subscription;
}
