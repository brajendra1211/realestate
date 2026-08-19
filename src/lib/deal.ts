import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";
import { computeBrokerage } from "@/lib/commission";
import { getSiteSettings } from "@/lib/site-settings";
import type { Deal, PaymentMode, Prisma } from "@/generated/prisma";

export class DealServiceError extends Error {}

export type RecordDealInput = {
  dealValue: number;
  buyerAgentId?: string | null;
  sellerAgentId?: string | null;
  paymentMode: PaymentMode;
  note?: string | null;
};

// One-click Master Commission Calculator, brokerage half — §3.12/§3.14. 1%
// each side, credited 100% to the respective agent (no company cut on this
// line, confirmed against the source doc's §6 ambiguity).
export async function recordDeal(input: RecordDealInput) {
  if (!Number.isFinite(input.dealValue) || input.dealValue <= 0) {
    throw new DealServiceError("validation");
  }
  if (!input.buyerAgentId && !input.sellerAgentId) {
    throw new DealServiceError("noAgents");
  }

  const [buyerAgent, sellerAgent] = await Promise.all([
    input.buyerAgentId
      ? prisma.agentProfile.findUnique({
          where: { id: input.buyerAgentId },
          include: { user: { select: { phone: true, email: true } } },
        })
      : null,
    input.sellerAgentId
      ? prisma.agentProfile.findUnique({
          where: { id: input.sellerAgentId },
          include: { user: { select: { phone: true, email: true } } },
        })
      : null,
  ]);
  if (input.buyerAgentId && !buyerAgent) throw new DealServiceError("buyerAgentNotFound");
  if (input.sellerAgentId && !sellerAgent) throw new DealServiceError("sellerAgentNotFound");

  const settings = await getSiteSettings();
  const buyerCommission = buyerAgent ? computeBrokerage(input.dealValue, settings.brokeragePercent) : null;
  const sellerCommission = sellerAgent ? computeBrokerage(input.dealValue, settings.brokeragePercent) : null;

  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.deal.create({
      data: {
        dealValue: input.dealValue,
        buyerAgentId: input.buyerAgentId || null,
        sellerAgentId: input.sellerAgentId || null,
        buyerCommission,
        sellerCommission,
        paymentMode: input.paymentMode,
        note: input.note?.trim() || null,
      },
    }),
  ];

  if (buyerAgent && buyerCommission) {
    ops.push(
      prisma.commissionLedgerEntry.create({
        data: {
          agentId: buyerAgent.id,
          type: "BROKERAGE",
          amount: buyerCommission,
          note: `${settings.brokeragePercent}% buyer-side brokerage on ₹${input.dealValue.toLocaleString("en-IN")} deal`,
        },
      }),
      prisma.agentProfile.update({
        where: { id: buyerAgent.id },
        data: { walletBalance: { increment: buyerCommission } },
      })
    );
  }
  if (sellerAgent && sellerCommission) {
    ops.push(
      prisma.commissionLedgerEntry.create({
        data: {
          agentId: sellerAgent.id,
          type: "BROKERAGE",
          amount: sellerCommission,
          note: `${settings.brokeragePercent}% seller-side brokerage on ₹${input.dealValue.toLocaleString("en-IN")} deal`,
        },
      }),
      prisma.agentProfile.update({
        where: { id: sellerAgent.id },
        data: { walletBalance: { increment: sellerCommission } },
      })
    );
  }

  const [deal] = (await prisma.$transaction(ops)) as [Deal, ...unknown[]];

  if (buyerAgent && buyerCommission) {
    await notifyUser(
      buyerAgent.user,
      `You earned ₹${buyerCommission} (${settings.brokeragePercent}% buyer-side brokerage) on a ₹${input.dealValue.toLocaleString("en-IN")} deal. It's now in your wallet.`,
      "Brokerage commission credited"
    );
  }
  if (sellerAgent && sellerCommission) {
    await notifyUser(
      sellerAgent.user,
      `You earned ₹${sellerCommission} (${settings.brokeragePercent}% seller-side brokerage) on a ₹${input.dealValue.toLocaleString("en-IN")} deal. It's now in your wallet.`,
      "Brokerage commission credited"
    );
  }

  return deal;
}

export async function getDealHistory() {
  return prisma.deal.findMany({
    include: {
      buyerAgent: { select: { agentCode: true, user: { select: { name: true } } } },
      sellerAgent: { select: { agentCode: true, user: { select: { name: true } } } },
    },
    orderBy: { dealDate: "desc" },
    take: 100,
  });
}
