import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { notifyUser } from "@/lib/notify";
import { generateInvestorCode } from "@/lib/codes";
import { computeProfitSplit } from "@/lib/commission";
import { getSiteSettings } from "@/lib/site-settings";
import type { PaymentMode } from "@/generated/prisma";

export class InvestorServiceError extends Error {}

async function uniqueInvestorUserSlug(name: string) {
  const base = slugify(name) || "investor";
  let slug = base;
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.user.findUnique({ where: { slug } });
    if (!existing) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

export type InvestorRegistrationInput = {
  name: string;
  email: string;
  phone: string;
};

export async function registerInvestor(agentProfileId: string, input: InvestorRegistrationInput) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const phone = input.phone.trim();

  if (!name || !email || !phone) {
    throw new InvestorServiceError("validation");
  }

  const agent = await prisma.agentProfile.findUnique({ where: { id: agentProfileId } });
  if (!agent) throw new InvestorServiceError("agentNotFound");

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new InvestorServiceError("duplicate");
  }

  // registrationFee is stamped at registration time from the currently
  // configured rate — later admin changes to investorRegistrationFee don't
  // retroactively change what an already-registered investor owes.
  const settings = await getSiteSettings();

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      slug: await uniqueInvestorUserSlug(name),
      role: "INVESTOR",
      investorProfile: {
        create: {
          referringAgentId: agentProfileId,
          registrationFee: settings.investorRegistrationFee,
        },
      },
    },
    include: { investorProfile: true },
  });

  return user;
}

export async function confirmInvestorPayment(investorProfileId: string, paymentMode: PaymentMode) {
  const investor = await prisma.investorProfile.findUnique({
    where: { id: investorProfileId },
    include: { referringAgent: { include: { user: { select: { phone: true, email: true } } } } },
  });
  if (!investor) throw new InvestorServiceError("notFound");
  if (investor.feeStatus === "PAID") return investor;

  const investorCode = investor.investorCode ?? (await generateInvestorCode());
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  const settings = await getSiteSettings();
  // Referral % applies to *this* investor's actual registrationFee (stamped
  // at registration time), not whatever investorRegistrationFee is
  // currently configured — a later fee change shouldn't change what an
  // already-registered investor's referral was worth.
  const referralShare = Math.round(investor.registrationFee * (settings.investorReferralPercent / 100));

  const [updatedInvestor] = await prisma.$transaction([
    prisma.investorProfile.update({
      where: { id: investorProfileId },
      data: { feeStatus: "PAID", investorCode, registeredAt: now, expiresAt, feePaymentMode: paymentMode },
    }),
    prisma.commissionLedgerEntry.create({
      data: {
        agentId: investor.referringAgentId,
        type: "REGISTRATION_REFERRAL",
        amount: referralShare,
        refId: investorProfileId,
        note: `${settings.investorReferralPercent}% referral for investor ${investorCode} registration fee`,
      },
    }),
    prisma.agentProfile.update({
      where: { id: investor.referringAgentId },
      data: { walletBalance: { increment: referralShare } },
    }),
  ]);

  await notifyUser(
    investor.referringAgent.user,
    `You earned ₹${referralShare} for referring investor ${investorCode}. It's now in your wallet.`,
    "Referral commission credited"
  );

  return updatedInvestor;
}

export async function getInvestorByUserId(userId: string) {
  return prisma.investorProfile.findUnique({
    where: { userId },
    include: { referringAgent: { select: { agentCode: true, shopName: true } } },
  });
}

export async function getInvestorsForAgent(agentProfileId: string) {
  return prisma.investorProfile.findMany({
    where: { referringAgentId: agentProfileId },
    include: {
      profitDistributions: { orderBy: { distributedAt: "desc" }, take: 1 },
      _count: { select: { profitDistributions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Investor Portal's "Total active investment capital" — §3.14. A snapshot
// admin sets/updates (how much capital this investor currently has active),
// not a running sum of ledger credits.
export async function updateInvestorCapital(investorProfileId: string, totalInvested: number) {
  if (!Number.isFinite(totalInvested) || totalInvested < 0) {
    throw new InvestorServiceError("validation");
  }
  const investor = await prisma.investorProfile.findUnique({ where: { id: investorProfileId } });
  if (!investor) throw new InvestorServiceError("notFound");

  return prisma.investorProfile.update({
    where: { id: investorProfileId },
    data: { totalInvested },
  });
}

export type DistributeProfitInput = {
  investorProfileId: string;
  totalProfit: number;
  paymentMode: PaymentMode;
  note?: string | null;
  customerTransactionRef?: string | null;
};

// Investor+Company joint deal profit split, one-click — §3.13/§3.14. 10%
// agent / 10% company expense / 40% investor / 40% company. The agent and
// investor shares are two *separate* line items (never merged, per §3.14) —
// investor's own registration-referral commission (§3.11) is a different
// CommissionLedgerEntry type entirely.
export async function distributeInvestorDealProfit(input: DistributeProfitInput) {
  if (!Number.isFinite(input.totalProfit) || input.totalProfit <= 0) {
    throw new InvestorServiceError("validation");
  }

  const investor = await prisma.investorProfile.findUnique({
    where: { id: input.investorProfileId },
    include: { referringAgent: { include: { user: { select: { phone: true, email: true } } } }, user: true },
  });
  if (!investor) throw new InvestorServiceError("notFound");

  const settings = await getSiteSettings();
  const split = computeProfitSplit(input.totalProfit, {
    agentPercent: settings.profitAgentSharePercent,
    expensePercent: settings.profitExpenseSharePercent,
    investorPercent: settings.profitInvestorSharePercent,
  });
  const now = new Date();
  // "Hold duration (days)" — §3.14's Investor Portal ledger spec. Measured
  // from when the investor's registration became active to this profit
  // credit, since there's no separate per-capital investment date in the
  // schema yet.
  const holdDurationDays = Math.max(
    0,
    Math.round((now.getTime() - investor.registeredAt.getTime()) / (24 * 60 * 60 * 1000))
  );

  const [distribution] = await prisma.$transaction([
    prisma.profitDistribution.create({
      data: {
        investorProfileId: investor.id,
        agentId: investor.referringAgentId,
        totalProfit: input.totalProfit,
        ...split,
        paymentMode: input.paymentMode,
        note: input.note?.trim() || null,
      },
    }),
    prisma.commissionLedgerEntry.create({
      data: {
        agentId: investor.referringAgentId,
        type: "DEAL_PROFIT_SHARE",
        amount: split.agentShare,
        refId: investor.id,
        note: `${settings.profitAgentSharePercent}% investor deal profit share for ${investor.investorCode ?? investor.id}`,
      },
    }),
    prisma.agentProfile.update({
      where: { id: investor.referringAgentId },
      data: { walletBalance: { increment: split.agentShare } },
    }),
    prisma.investorLedgerEntry.create({
      data: {
        investorProfileId: investor.id,
        amount: split.investorShare,
        refId: investor.id,
        customerTransactionRef: input.customerTransactionRef?.trim() || null,
        holdDurationDays,
        note: `${settings.profitInvestorSharePercent}% profit share on ₹${input.totalProfit.toLocaleString("en-IN")} deal profit`,
      },
    }),
  ]);

  await notifyUser(
    investor.referringAgent.user,
    `You earned ₹${split.agentShare} (${settings.profitAgentSharePercent}% deal profit share) for investor ${investor.investorCode ?? ""}. It's now in your wallet.`,
    "Deal profit share credited"
  );
  await notifyUser(
    investor.user,
    `A profit of ₹${split.investorShare.toLocaleString("en-IN")} has been credited to your investor ledger.`,
    "Profit credited"
  );

  return distribution;
}

// Renewal alert system for investor 1-year expiries — §3.14 Admin Panel.
export async function getInvestorsExpiringSoon(withinDays = 30) {
  const now = new Date();
  const horizon = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);
  return prisma.investorProfile.findMany({
    where: { feeStatus: "PAID", expiresAt: { not: null, lte: horizon } },
    include: { user: { select: { name: true } }, referringAgent: { select: { agentCode: true } } },
    orderBy: { expiresAt: "asc" },
  });
}

export async function getInvestorLedger(investorProfileId: string) {
  const [entries, distributions] = await Promise.all([
    prisma.investorLedgerEntry.findMany({
      where: { investorProfileId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.profitDistribution.findMany({
      where: { investorProfileId },
      orderBy: { distributedAt: "desc" },
    }),
  ]);
  const totalProfit = entries.reduce((sum, entry) => sum + entry.amount, 0);
  return { entries, distributions, totalProfit };
}
