import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";
import { computeTds } from "@/lib/commission";
import { getSiteSettings } from "@/lib/site-settings";
import type { PaymentMode } from "@/generated/prisma";

export class PayoutServiceError extends Error {}

// Agent wallet → bank, TDS deducted automatically — §3.14. Wallet balance is
// reserved at request time (so an agent can't request more than they have
// across multiple pending requests); rejecting a request credits it back.
export async function requestAgentPayout(agentProfileId: string, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new PayoutServiceError("validation");
  }

  const agent = await prisma.agentProfile.findUnique({ where: { id: agentProfileId } });
  if (!agent) throw new PayoutServiceError("notFound");
  if (amount > agent.walletBalance) throw new PayoutServiceError("insufficientBalance");

  const settings = await getSiteSettings();
  const { tdsAmount, netAmount } = computeTds(amount, settings.tdsPercent);

  const [, payout] = await prisma.$transaction([
    prisma.agentProfile.update({
      where: { id: agentProfileId },
      data: { walletBalance: { decrement: amount } },
    }),
    prisma.payoutRequest.create({
      data: {
        agentId: agentProfileId,
        grossAmount: amount,
        tdsPercent: settings.tdsPercent,
        tdsAmount,
        netAmount,
      },
    }),
  ]);

  return payout;
}

export async function processAgentPayout(payoutRequestId: string, paymentMode: PaymentMode) {
  const payout = await prisma.payoutRequest.findUnique({
    where: { id: payoutRequestId },
    include: { agent: { include: { user: { select: { phone: true, email: true } } } } },
  });
  if (!payout) throw new PayoutServiceError("notFound");
  if (payout.status !== "PENDING") return payout;

  const updated = await prisma.payoutRequest.update({
    where: { id: payoutRequestId },
    data: { status: "PAID", paymentMode, processedAt: new Date() },
  });

  await notifyUser(
    payout.agent.user,
    `Your payout of ₹${payout.netAmount.toLocaleString("en-IN")} (₹${payout.grossAmount.toLocaleString("en-IN")} gross, ₹${payout.tdsAmount.toLocaleString("en-IN")} TDS deducted) has been sent.`,
    "Payout processed"
  );

  return updated;
}

export async function rejectAgentPayout(payoutRequestId: string) {
  const payout = await prisma.payoutRequest.findUnique({
    where: { id: payoutRequestId },
    include: { agent: { include: { user: { select: { phone: true, email: true } } } } },
  });
  if (!payout) throw new PayoutServiceError("notFound");
  if (payout.status !== "PENDING") return payout;

  const [, updated] = await prisma.$transaction([
    prisma.agentProfile.update({
      where: { id: payout.agentId },
      data: { walletBalance: { increment: payout.grossAmount } },
    }),
    prisma.payoutRequest.update({
      where: { id: payoutRequestId },
      data: { status: "REJECTED", processedAt: new Date() },
    }),
  ]);

  await notifyUser(
    payout.agent.user,
    `Your payout request for ₹${payout.grossAmount.toLocaleString("en-IN")} was rejected and credited back to your wallet.`,
    "Payout rejected"
  );

  return updated;
}

export async function getPayoutsForAgent(agentProfileId: string) {
  return prisma.payoutRequest.findMany({
    where: { agentId: agentProfileId },
    orderBy: { requestedAt: "desc" },
  });
}

export async function getPendingPayouts() {
  return prisma.payoutRequest.findMany({
    where: { status: "PENDING" },
    include: { agent: { select: { agentCode: true, user: { select: { name: true } } } } },
    orderBy: { requestedAt: "asc" },
  });
}
