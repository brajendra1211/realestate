import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { notifyUser } from "@/lib/notify";
import { generateInvestorCode } from "@/lib/codes";

export class InvestorServiceError extends Error {}

// 10% of the ₹20,000 registration fee — docs/platform-requirements.md §3.11
const REGISTRATION_REFERRAL_SHARE = 2000;

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
        },
      },
    },
    include: { investorProfile: true },
  });

  return user;
}

export async function confirmInvestorPayment(investorProfileId: string) {
  const investor = await prisma.investorProfile.findUnique({
    where: { id: investorProfileId },
    include: { referringAgent: { include: { user: { select: { phone: true, email: true } } } } },
  });
  if (!investor) throw new InvestorServiceError("notFound");
  if (investor.feeStatus === "PAID") return investor;

  const investorCode = investor.investorCode ?? (await generateInvestorCode());
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  const [updatedInvestor] = await prisma.$transaction([
    prisma.investorProfile.update({
      where: { id: investorProfileId },
      data: { feeStatus: "PAID", investorCode, registeredAt: now, expiresAt },
    }),
    prisma.commissionLedgerEntry.create({
      data: {
        agentId: investor.referringAgentId,
        type: "REGISTRATION_REFERRAL",
        amount: REGISTRATION_REFERRAL_SHARE,
        refId: investorProfileId,
        note: `10% referral for investor ${investorCode} registration fee`,
      },
    }),
    prisma.agentProfile.update({
      where: { id: investor.referringAgentId },
      data: { walletBalance: { increment: REGISTRATION_REFERRAL_SHARE } },
    }),
  ]);

  await notifyUser(
    investor.referringAgent.user,
    `You earned ₹${REGISTRATION_REFERRAL_SHARE} for referring investor ${investorCode}. It's now in your wallet.`,
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
    orderBy: { createdAt: "desc" },
  });
}
