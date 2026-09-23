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

export type CreateB2BDealInput = {
  dealValue: number;
  totalCommission?: number;
  buyerAgentId?: string | null;
  sellerAgentId?: string | null;
  broadcastId?: string | null;
  propertyTitle?: string | null;
  note?: string | null;
  paymentMode?: PaymentMode;
};

// PDF 1 Page 11 & PDF 2 Page 11:
// Creates a B2B Deal with 10% platform deduction and 50-50 split between Buyer & Seller agent
export async function createB2BDeal(input: CreateB2BDealInput) {
  if (!Number.isFinite(input.dealValue) || input.dealValue <= 0) {
    throw new DealServiceError("validation");
  }

  const [buyerAgent, sellerAgent, settings] = await Promise.all([
    input.buyerAgentId ? prisma.agentProfile.findUnique({ where: { id: input.buyerAgentId } }) : null,
    input.sellerAgentId ? prisma.agentProfile.findUnique({ where: { id: input.sellerAgentId } }) : null,
    getSiteSettings(),
  ]);

  // Total brokerage: default to 2% (1% each side) or custom commission
  const totalCommission =
    input.totalCommission && input.totalCommission > 0
      ? input.totalCommission
      : Math.round(input.dealValue * ((settings.brokeragePercent * 2) / 100));

  // 10% platform share automatically deducted for company
  const platformPercent = 10;
  const platformCommission = Math.round(totalCommission * (platformPercent / 100));
  const agentPool = totalCommission - platformCommission; // 90%

  // 50-50 split between Buyer Agent & Seller Agent (45% each)
  const buyerCommission = buyerAgent ? Math.round(agentPool / 2) : 0;
  const sellerCommission = sellerAgent ? agentPool - buyerCommission : 0;

  const deal = await prisma.deal.create({
    data: {
      dealValue: input.dealValue,
      propertyTitle: input.propertyTitle?.trim() || null,
      broadcastId: input.broadcastId || null,
      buyerAgentId: input.buyerAgentId || null,
      sellerAgentId: input.sellerAgentId || null,
      status: "ACTIVE",
      totalCommission,
      platformPercent,
      platformCommission,
      buyerCommission,
      sellerCommission,
      paymentMode: input.paymentMode ?? "BANK_TRANSFER",
      commissionDistributed: false,
      note: input.note?.trim() || null,
    },
    include: {
      buyerAgent: { select: { agentCode: true, user: { select: { name: true, phone: true } } } },
      sellerAgent: { select: { agentCode: true, user: { select: { name: true, phone: true } } } },
    },
  });

  return deal;
}

// Advances the deal through the 5-stage lifecycle:
// ACTIVE -> TOKEN_RECEIVED -> AGREEMENT_DONE -> REGISTRY_COMPLETED -> CLOSED
export async function advanceDealStage(
  dealId: string,
  targetStatus: import("@/generated/prisma").DealStatus,
  metadata?: { tokenAmount?: number; note?: string }
) {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      buyerAgent: { include: { user: true } },
      sellerAgent: { include: { user: true } },
    },
  });
  if (!deal) throw new DealServiceError("notFound");

  const now = new Date();
  const updateData: Prisma.DealUpdateInput = {
    status: targetStatus,
  };

  if (targetStatus === "TOKEN_RECEIVED") {
    updateData.tokenDate = now;
    if (metadata?.tokenAmount) updateData.tokenAmount = metadata.tokenAmount;
  } else if (targetStatus === "AGREEMENT_DONE") {
    updateData.agreementDate = now;
  } else if (targetStatus === "REGISTRY_COMPLETED" || targetStatus === "CLOSED") {
    updateData.registryDate = now;
  }

  // Distribute commissions to agents' platform wallets on Registry Completed / Closed
  if (
    (targetStatus === "REGISTRY_COMPLETED" || targetStatus === "CLOSED") &&
    !deal.commissionDistributed
  ) {
    updateData.commissionDistributed = true;

    const ops: Prisma.PrismaPromise<unknown>[] = [
      prisma.deal.update({
        where: { id: dealId },
        data: updateData,
      }),
    ];

    if (deal.buyerAgent && deal.buyerCommission && deal.buyerCommission > 0) {
      ops.push(
        prisma.commissionLedgerEntry.create({
          data: {
            agentId: deal.buyerAgent.id,
            type: "DEAL_PROFIT_SHARE",
            amount: deal.buyerCommission,
            refId: dealId,
            note: `45% B2B deal commission for registry on "${deal.propertyTitle || "Property Deal"}"`,
          },
        }),
        prisma.agentProfile.update({
          where: { id: deal.buyerAgent.id },
          data: { walletBalance: { increment: deal.buyerCommission } },
        })
      );
    }

    if (deal.sellerAgent && deal.sellerCommission && deal.sellerCommission > 0) {
      ops.push(
        prisma.commissionLedgerEntry.create({
          data: {
            agentId: deal.sellerAgent.id,
            type: "DEAL_PROFIT_SHARE",
            amount: deal.sellerCommission,
            refId: dealId,
            note: `45% B2B deal commission for registry on "${deal.propertyTitle || "Property Deal"}"`,
          },
        }),
        prisma.agentProfile.update({
          where: { id: deal.sellerAgent.id },
          data: { walletBalance: { increment: deal.sellerCommission } },
        })
      );
    }

    const [updatedDeal] = (await prisma.$transaction(ops)) as [Deal, ...unknown[]];

    if (deal.buyerAgent && deal.buyerCommission) {
      await notifyUser(
        deal.buyerAgent.user,
        `Registry Completed! Your 45% deal commission of ₹${deal.buyerCommission.toLocaleString(
          "en-IN"
        )} on "${deal.propertyTitle || "Deal"}" has been credited to your wallet.`,
        "Deal Commission Credited"
      );
    }
    if (deal.sellerAgent && deal.sellerCommission) {
      await notifyUser(
        deal.sellerAgent.user,
        `Registry Completed! Your 45% deal commission of ₹${deal.sellerCommission.toLocaleString(
          "en-IN"
        )} on "${deal.propertyTitle || "Deal"}" has been credited to your wallet.`,
        "Deal Commission Credited"
      );
    }

    return updatedDeal;
  }

  return prisma.deal.update({
    where: { id: dealId },
    data: updateData,
    include: {
      buyerAgent: { select: { agentCode: true, user: { select: { name: true } } } },
      sellerAgent: { select: { agentCode: true, user: { select: { name: true } } } },
    },
  });
}

export async function getDealsForAgent(agentProfileId: string) {
  return prisma.deal.findMany({
    where: {
      OR: [{ buyerAgentId: agentProfileId }, { sellerAgentId: agentProfileId }],
    },
    include: {
      buyerAgent: { select: { agentCode: true, user: { select: { name: true, phone: true } } } },
      sellerAgent: { select: { agentCode: true, user: { select: { name: true, phone: true } } } },
      broadcast: { select: { flatSize: true, txnType: true, society: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
