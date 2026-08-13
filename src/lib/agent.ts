import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { slugify } from "@/lib/slug";
import { notifyUser } from "@/lib/notify";
import { generateAgentCode } from "@/lib/codes";

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
  type: "RERA_CERTIFICATE" | "TRADE_LICENSE" | "GST_CERTIFICATE" | "OTHER";
  url: string;
};

export type AgentApplicationInput = {
  name: string;
  email: string;
  phone?: string | null;
  alternatePhone?: string | null;
  password: string;
  shopName: string;
  shopAddress: string;
  city: string;
  yearsExperience?: number | null;
  staffCount?: number | null;
  reraNumber?: string | null;
  gstNumber?: string | null;
  documents?: AgentDocumentInput[];
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

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone: input.phone?.trim() || null,
      slug: await uniqueAgentUserSlug(input.shopName || name),
      passwordHash: await hashPassword(input.password),
      role: "AGENT",
      agentProfile: {
        create: {
          city: input.city.trim(),
          shopName: input.shopName.trim(),
          shopAddress: input.shopAddress.trim(),
          alternatePhone: input.alternatePhone?.trim() || null,
          yearsExperience: input.yearsExperience ?? null,
          staffCount: input.staffCount ?? null,
          reraNumber: input.reraNumber?.trim() || null,
          gstNumber: input.gstNumber?.trim() || null,
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

export async function activateAgentPrime(agentProfileId: string, planId: string) {
  const [agent, plan] = await Promise.all([
    prisma.agentProfile.findUnique({ where: { id: agentProfileId }, include: { user: true } }),
    prisma.plan.findUnique({ where: { id: planId } }),
  ]);
  if (!agent) throw new AgentServiceError("notFound");
  if (agent.status !== "APPROVED") {
    throw new AgentServiceError("notVerified");
  }
  if (!plan) throw new AgentServiceError("planNotFound");

  const agentCode = agent.agentCode ?? (await generateAgentCode(agent.city));

  const [, updatedAgent] = await prisma.$transaction([
    prisma.subscription.updateMany({
      where: { userId: agent.userId, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    }),
    prisma.agentProfile.update({
      where: { id: agentProfileId },
      data: { primeStatus: true, agentCode },
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
  ]);

  await notifyUser(
    agent.user,
    `Your Prime plan is active. Your Agent Code is ${agentCode}.`,
    "Prime activated — Agent Code assigned"
  );

  return updatedAgent;
}

export async function getAgentByUserId(userId: string) {
  return prisma.agentProfile.findUnique({
    where: { userId },
    include: { documents: true, investors: true },
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
  };
  for (const entry of entries) {
    totals[entry.type] = (totals[entry.type] ?? 0) + entry.amount;
  }

  return { entries, totals };
}
