import { prisma } from "@/lib/prisma";
import { confirmInvestorPayment, InvestorServiceError } from "@/lib/investor";
import {
  createRazorpayOrder,
  getRazorpayKeyId,
  isRazorpayConfigured,
  verifyPaidOrder,
} from "@/lib/razorpay";

const receiptPrefix = (investorProfileId: string) => `invfee_${investorProfileId}_`;

// Who may pay a referral partner's registration fee: the partner themselves or
// the channel partner who registered them.
async function loadForPayer(investorProfileId: string, userId: string) {
  const inv = await prisma.investorProfile.findUnique({
    where: { id: investorProfileId },
    include: { referringAgent: { select: { userId: true } } },
  });
  if (!inv) throw new InvestorServiceError("notFound");
  if (inv.userId !== userId && inv.referringAgent.userId !== userId) {
    throw new InvestorServiceError("unauthorized");
  }
  return inv;
}

export async function createInvestorFeeOrder(investorProfileId: string, payerUserId: string) {
  const inv = await loadForPayer(investorProfileId, payerUserId);
  if (inv.feeStatus === "PAID") throw new InvestorServiceError("alreadyPaid");
  if (!isRazorpayConfigured()) throw new InvestorServiceError("paymentUnavailable");
  const order = await createRazorpayOrder(inv.registrationFee, `${receiptPrefix(inv.id)}${Date.now()}`);
  if (!order) throw new InvestorServiceError("paymentUnavailable");
  return { order, keyId: getRazorpayKeyId(), amount: inv.registrationFee };
}

/** Verified payment => fee confirmed, code issued and referral credited, with no admin step. */
export async function confirmInvestorFeeOnline(
  investorProfileId: string,
  payerUserId: string,
  p: { razorpayOrderId?: string | null; razorpayPaymentId?: string | null; razorpaySignature?: string | null }
) {
  const inv = await loadForPayer(investorProfileId, payerUserId);
  if (inv.feeStatus === "PAID") return inv; // idempotent: a replay can never credit twice
  const ok = await verifyPaidOrder({
    orderId: p.razorpayOrderId,
    paymentId: p.razorpayPaymentId,
    signature: p.razorpaySignature,
    amountRupees: inv.registrationFee,
    receiptPrefix: receiptPrefix(inv.id),
  });
  if (!ok) throw new InvestorServiceError("paymentInvalid");
  // Razorpay covers UPI, cards and netbanking; UPI is the closest existing mode.
  return confirmInvestorPayment(inv.id, "UPI");
}
