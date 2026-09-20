import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { slugify } from "@/lib/slug";
import { notifyUser } from "@/lib/notify";
import { generateAgentCode } from "@/lib/codes";
import { geocodeLocation } from "@/lib/geocode";
import { indexAgentLocation } from "@/lib/agentGeo";
import { getSiteSettings } from "@/lib/site-settings";
import type { AgentDocumentType, AgentProfile, Prisma } from "@/generated/prisma";

export class AgentServiceError extends Error {}

async function uniqueAgentUserSlug(name: string) {
  const base = slugify(name) || "agent";
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

export type AgentDocumentInput = {
  type: AgentDocumentType;
  url: string;
};

export type AgentApplicationInput = {
  name: string;
  email: string;
  phone?: string | null;
  alternatePhone?: string | null;
  whatsappNumber?: string | null;
  age?: number | null;
  dateOfBirth?: Date | null;
  panNumber?: string | null;
  panCardUrl?: string | null;
  aadhaarNumber?: string | null;
  aadhaarFrontUrl?: string | null;
  aadhaarBackUrl?: string | null;
  website?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  cancelledChequeUrl?: string | null;
  password: string;
  shopName: string;
  shopAddress: string;
  city: string;
  yearsExperience?: number | null;
  staffCount?: number | null;
  reraNumber?: string | null;
  gstNumber?: string | null;
  documents?: AgentDocumentInput[];
  referredByAgentCode?: string | null;
};

export async function submitAgentApplication(input: AgentApplicationInput) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  if (!name || !email || input.password.length < 8) {
    throw new AgentServiceError("validation");
  }
  if (!input.shopName.trim() || !input.shopAddress.trim() || !input.city.trim()) {
    throw new AgentServiceError("shopDetails");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AgentServiceError("duplicate");
  }

  const shopCoords = await geocodeLocation(`${input.shopAddress.trim()}, ${input.city.trim()}`);

  let referringAgentId: string | null = null;
  const referredByAgentCode = input.referredByAgentCode?.trim();
  if (referredByAgentCode) {
    const referrer = await prisma.agentProfile.findUnique({
      where: { agentCode: referredByAgentCode },
    });
    if (!referrer) throw new AgentServiceError("referrerNotFound");
    referringAgentId = referrer.id;
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone: input.phone?.trim() || null,
      secondaryPhone: input.alternatePhone?.trim() || null,
      whatsappNumber: input.whatsappNumber?.trim() || input.phone?.trim() || null,
      age: input.age ?? null,
      dateOfBirth: input.dateOfBirth ?? null,
      panNumber: input.panNumber?.trim() || null,
      panCardUrl: input.panCardUrl?.trim() || null,
      aadhaarNumber: input.aadhaarNumber?.trim() || null,
      aadhaarFrontUrl: input.aadhaarFrontUrl?.trim() || null,
      aadhaarBackUrl: input.aadhaarBackUrl?.trim() || null,
      website: input.website?.trim() || null,
      bankAccountName: input.bankAccountName?.trim() || null,
      bankAccountNumber: input.bankAccountNumber?.trim() || null,
      bankIfsc: input.bankIfsc?.trim() || null,
      bankName: input.bankName?.trim() || null,
      bankBranch: input.bankBranch?.trim() || null,
      cancelledChequeUrl: input.cancelledChequeUrl?.trim() || null,
      slug: await uniqueAgentUserSlug(input.shopName || name),
      passwordHash: await hashPassword(input.password),
      role: "AGENT",
      agentProfile: {
        create: {
          city: input.city.trim(),
          shopName: input.shopName.trim(),
          shopAddress: input.shopAddress.trim(),
          shopLatitude: shopCoords?.latitude ?? null,
          shopLongitude: shopCoords?.longitude ?? null,
          alternatePhone: input.alternatePhone?.trim() || null,
          yearsExperience: input.yearsExperience ?? null,
          staffCount: input.staffCount ?? null,
          reraNumber: input.reraNumber?.trim() || null,
          gstNumber: input.gstNumber?.trim() || null,
          referringAgentId,
          documents: input.documents?.length
            ? { create: input.documents.map((doc) => ({ type: doc.type, url: doc.url })) }
            : undefined,
        },
      },
    },
    include: { agentProfile: true },
  });

  return user;
}

export async function approveAgent(agentProfileId: string) {
  const agent = await prisma.agentProfile.update({
    where: { id: agentProfileId },
    data: { status: "APPROVED", rejectionReason: null, verifiedAt: new Date() },
    include: { user: { select: { phone: true, email: true } } },
  });
  await notifyUser(
    agent.user,
    "Your BayaEstate agent profile is verified. Admin will activate your Prime plan next to issue your Agent Code.",
    "Agent profile verified"
  );
  return agent;
}

export async function rejectAgent(agentProfileId: string, reason: string) {
  return prisma.agentProfile.update({
    where: { id: agentProfileId },
    data: { status: "REJECTED", rejectionReason: reason.trim() || null },
  });
}

// % of the referred agent's first Prime subscription payment — §3.20, a
// one-time credit (confirmed with the client as the reading of "10%
// commission from the new agent's code"), the direct parallel to
// §3.11's investor-referral credit. Rate is admin-editable
// (SiteSettings.agentReferralPercent), fetched below.
export async function activateAgentPrime(agentProfileId: string, planId: string) {
  const [agent, plan, settings] = await Promise.all([
    prisma.agentProfile.findUnique({
      where: { id: agentProfileId },
      include: {
        user: true,
        referringAgent: { include: { user: { select: { phone: true, email: true } } } },
      },
    }),
    prisma.plan.findUnique({ where: { id: planId } }),
    getSiteSettings(),
  ]);
  if (!agent) throw new AgentServiceError("notFound");
  if (agent.status !== "APPROVED") {
    throw new AgentServiceError("notVerified");
  }
  if (!plan) throw new AgentServiceError("planNotFound");

  // The referral credit is one-time, so it only fires the first time this
  // agent ever activates Prime — i.e. before an Agent Code has been minted.
  // Renewals (agent.agentCode already set) never re-trigger it.
  const isFirstActivation = !agent.agentCode;
  const agentCode = agent.agentCode ?? (await generateAgentCode(agent.city));
  const planTier = plan.price <= 1000 ? "BASIC" : "PRIME";
  const splitPercent = settings.agentPlanSplitPercent ?? 50;
  const referralAmount =
    isFirstActivation && agent.referringAgent
      ? Math.round(plan.price * (splitPercent / 100))
      : 0;

  const ops: Prisma.PrismaPromise<unknown>[] = [
    prisma.subscription.updateMany({
      where: { userId: agent.userId, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    }),
    prisma.agentProfile.update({
      where: { id: agentProfileId },
      data: {
        primeStatus: true,
        visibilityDeprioritized: false,
        planTier,
        agentCode,
        renewalAlertSentAt: null,
      },
    }),
    prisma.subscription.create({
      data: {
        userId: agent.userId,
        planId,
        status: "ACTIVE",
        amount: plan.price,
        endDate: plan.durationDays
          ? new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000)
          : null,
      },
    }),
  ];

  if (referralAmount > 0 && agent.referringAgent) {
    ops.push(
      prisma.commissionLedgerEntry.create({
        data: {
          agentId: agent.referringAgent.id,
          type: "AGENT_REFERRAL",
          amount: referralAmount,
          refId: agentProfileId,
          note: `${splitPercent}% referral for agent ${agentCode}'s first ${planTier} registration payment`,
        },
      }),
      prisma.agentProfile.update({
        where: { id: agent.referringAgent.id },
        data: { walletBalance: { increment: referralAmount } },
      })
    );
  }

  const [, updatedAgent] = (await prisma.$transaction(ops)) as [unknown, AgentProfile, ...unknown[]];

  // Phase 4 — only Prime agents with known coordinates are dispatch/broadcast
  // candidates; index (or re-index, on renewal) them the moment Prime is live.
  if (agent.shopLatitude != null && agent.shopLongitude != null) {
    await indexAgentLocation(agentProfileId, agent.shopLatitude, agent.shopLongitude);
  }

  await notifyUser(
    agent.user,
    `Your Prime plan is active. Your Agent Code is ${agentCode}.`,
    "Prime activated — Agent Code assigned"
  );

  if (referralAmount > 0 && agent.referringAgent) {
    await notifyUser(
      agent.referringAgent.user,
      `You earned ₹${referralAmount} for referring agent ${agentCode}, who just activated Prime. It's now in your wallet.`,
      "Agent referral commission credited"
    );
  }

  return updatedAgent;
}

export async function getAgentByUserId(userId: string) {
  return prisma.agentProfile.findUnique({
    where: { userId },
    include: { user: true, documents: true, investors: true },
  });
}

export async function getAgentCommissionSummary(agentProfileId: string) {
  const entries = await prisma.commissionLedgerEntry.findMany({
    where: { agentId: agentProfileId },
    orderBy: { createdAt: "desc" },
  });

  const totals: Record<string, number> = {
    REGISTRATION_REFERRAL: 0,
    DEAL_PROFIT_SHARE: 0,
    BROKERAGE: 0,
    UNLOCK_SPLIT: 0,
    GOLD_SPLIT: 0,
    AGENT_REFERRAL: 0,
    CUSTOMER_PROPERTY_UPDATE: 0,
    REFERRAL_CUSTOMER_RENEWAL: 0,
    COMPANY_FIVE_STAR_REWARD: 0,
  };
  for (const entry of entries) {
    totals[entry.type] = (totals[entry.type] ?? 0) + entry.amount;
  }

  return { entries, totals };
}
