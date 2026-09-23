import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";
import { findNearbyAgents } from "@/lib/agentGeo";

export class AgentSwitchServiceError extends Error {}

// §3.9's explicit abuse guardrails.
const MAX_SWITCHES_PER_DAY = 3;
const COOLDOWN_HOURS = 1.5; // "1-2 hour cooldown" — midpoint
const WARNING_THRESHOLD = 3; // "3-strike rule"

export async function canSwitchAgent(customerPhone: string) {
  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sinceCooldown = new Date(now.getTime() - COOLDOWN_HOURS * 60 * 60 * 1000);

  const [countToday, lastSwitch] = await Promise.all([
    prisma.agentSwitchLog.count({ where: { customerPhone, createdAt: { gte: since24h } } }),
    prisma.agentSwitchLog.findFirst({ where: { customerPhone }, orderBy: { createdAt: "desc" } }),
  ]);

  if (countToday >= MAX_SWITCHES_PER_DAY) {
    return { allowed: false as const, reason: "dailyLimitReached" as const };
  }
  if (lastSwitch && lastSwitch.createdAt > sinceCooldown) {
    const nextAllowedAt = new Date(lastSwitch.createdAt.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000);
    return { allowed: false as const, reason: "cooldown" as const, nextAllowedAt };
  }
  return { allowed: true as const };
}

export type SwitchAgentInput = {
  customerPhone: string;
  fromAgentId: string;
  reason: string;
  isComplaint: boolean;
  latitude: number;
  longitude: number;
  radiusKm?: number;
};

// "Customer can split/switch agents at will if unsatisfied" — §3.9. A
// mandatory reason is required (enforced here, not just a disabled button
// client-side); `isComplaint` marks it as a *formal* complaint, which is
// what actually blocks the agent from this customer and counts toward the
// 3-strike rule — a plain "switch" without a complaint doesn't punish the
// agent, it just routes the customer elsewhere.
export async function switchAgent(input: SwitchAgentInput) {
  if (!input.reason.trim()) throw new AgentSwitchServiceError("reasonRequired");

  const gate = await canSwitchAgent(input.customerPhone);
  if (!gate.allowed) throw new AgentSwitchServiceError(gate.reason);

  const replacement = await findReplacementAgent(
    input.customerPhone,
    input.latitude,
    input.longitude,
    input.radiusKm ?? 3,
    input.fromAgentId
  );

  const switchLog = await prisma.agentSwitchLog.create({
    data: {
      customerPhone: input.customerPhone,
      fromAgentId: input.fromAgentId,
      toAgentId: replacement?.agentProfileId ?? null,
      reason: input.reason.trim(),
      isComplaint: input.isComplaint,
    },
  });

  if (input.isComplaint) {
    await recordComplaint(input.fromAgentId, input.customerPhone, input.reason.trim());
  }

  return { switchLog, replacementAgentId: replacement?.agentProfileId ?? null };
}

async function recordComplaint(agentId: string, customerPhone: string, reason: string) {
  await prisma.customerAgentBlock.upsert({
    where: { customerPhone_agentId: { customerPhone, agentId } },
    update: {},
    create: { customerPhone, agentId, reason },
  });

  // "3 verified complaints against one Agent Code" — counted across all
  // customers, not just this one (a single customer can only block an agent
  // once, per the upsert above, so this can't be inflated by one person
  // spamming complaints against the same agent).
  const complaintCount = await prisma.customerAgentBlock.count({ where: { agentId } });

  if (complaintCount > 0 && complaintCount % WARNING_THRESHOLD === 0) {
    const agent = await prisma.agentProfile.update({
      where: { id: agentId },
      data: { warningCount: { increment: 1 } },
      include: { user: true },
    });
    await prisma.agentWarning.create({
      data: { agentId, reason: `${complaintCount} verified customer complaints reached` },
    });
    await notifyUser(
      agent.user,
      `You've received a formal warning after ${complaintCount} verified customer complaints. Your search ranking may be affected.`,
      "Warning issued"
    );
  }
}

// "New agent is drawn from the same 1-5km radius, weighted toward agents
// who know that specific micro-area well." §3.9 doesn't define "know the
// area," so this is an implementation call: prefer agents with an existing
// AgentListing in the same city over plain nearest-first, then fall back to
// distance. Excludes the agent being switched away from, every agent this
// customer has formally complained about, and any agent past the warning
// threshold (the "visible ranking drop" — they stop getting fresh matches).
export async function findReplacementAgent(
  customerPhone: string,
  latitude: number,
  longitude: number,
  radiusKm: number,
  excludeAgentId: string
) {
  const blocked = await prisma.customerAgentBlock.findMany({
    where: { customerPhone },
    select: { agentId: true },
  });
  const excludeIds = [excludeAgentId, ...blocked.map((b) => b.agentId)];

  const nearby = await findNearbyAgents(latitude, longitude, radiusKm, 15, excludeIds);
  if (nearby.length === 0) return null;

  const candidateIds = nearby.map((a) => a.agentProfileId);
  const candidates = await prisma.agentProfile.findMany({
    where: { id: { in: candidateIds } },
    select: { id: true, warningCount: true, _count: { select: { listings: true } } },
  });
  const byId = new Map(candidates.map((c) => [c.id, c]));

  const ranked = nearby
    .filter((a) => (byId.get(a.agentProfileId)?.warningCount ?? 0) < WARNING_THRESHOLD)
    .sort((a, b) => {
      const aListings = byId.get(a.agentProfileId)?._count.listings ?? 0;
      const bListings = byId.get(b.agentProfileId)?._count.listings ?? 0;
      if (aListings !== bListings) return bListings - aListings; // more local listings first
      return a.distanceKm - b.distanceKm;
    });

  return ranked[0] ?? null;
}

export async function getComplaintsForAgent(agentProfileId: string) {
  return prisma.customerAgentBlock.findMany({
    where: { agentId: agentProfileId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getWarningsForAgent(agentProfileId: string) {
  return prisma.agentWarning.findMany({
    where: { agentId: agentProfileId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Customer Protection Policy — 1-Time Free Switch Agent within 24 Hours
 * (PDF 2 Page 8):
 * If the assigned agent does not respond or customer is dissatisfied,
 * customer can switch agent within 24 hours of unlocking.
 * Finds next top-rated/nearest Prime agent in locality and assigns them for free.
 */
export async function switchUnlockedListingAgent(input: {
  buyerId: string;
  agentListingId: string;
  reason: string;
  isComplaint?: boolean;
}) {
  const reason = input.reason.trim();
  if (!reason) throw new AgentSwitchServiceError("reasonRequired");

  const unlock = await prisma.propertyUnlock.findUnique({
    where: {
      agentListingId_buyerId: {
        agentListingId: input.agentListingId,
        buyerId: input.buyerId,
      },
    },
    include: {
      buyer: true,
      agentListing: { include: { masterProperty: true } },
      assignedAgent: { include: { user: true } },
    },
  });
  if (!unlock) throw new AgentSwitchServiceError("notFound");

  // Check 1: Must be within 24 hours exclusivity window
  const now = new Date();
  if (unlock.expiresAt && now > unlock.expiresAt) {
    throw new AgentSwitchServiceError("exclusivityExpired");
  }

  // Check 2: Max 1 free switch per unlock
  if (unlock.switchedAgent) {
    throw new AgentSwitchServiceError("switchAlreadyUsed");
  }

  const currentAgentId = unlock.assignedAgentId ?? unlock.agentListing.agentId ?? "";
  const prop = unlock.agentListing.masterProperty;

  // Find next best agent in the property's coordinates or locality
  const replacement = await findReplacementAgent(
    unlock.buyer.phone ?? unlock.buyerId,
    prop.latitude ?? 28.6139,
    prop.longitude ?? 77.209,
    10, // 10km scan
    currentAgentId
  );

  if (!replacement) {
    throw new AgentSwitchServiceError("noAlternativeAgentAvailable");
  }

  const replacementAgent = await prisma.agentProfile.findUnique({
    where: { id: replacement.agentProfileId },
    include: { user: true },
  });
  if (!replacementAgent) {
    throw new AgentSwitchServiceError("noAlternativeAgentAvailable");
  }

  // Update PropertyUnlock with new assigned agent
  await prisma.propertyUnlock.update({
    where: { id: unlock.id },
    data: {
      assignedAgentId: replacementAgent.id,
      switchedAgent: true,
      switchedAt: now,
      switchReason: reason,
    },
  });

  // Log in agent switch log
  await prisma.agentSwitchLog.create({
    data: {
      customerPhone: unlock.buyer.phone ?? unlock.buyerId,
      fromAgentId: currentAgentId,
      toAgentId: replacementAgent.id,
      reason,
      isComplaint: Boolean(input.isComplaint),
    },
  });

  // If complaint, record block against previous agent
  if (input.isComplaint && currentAgentId && unlock.buyer.phone) {
    await recordComplaint(currentAgentId, unlock.buyer.phone, reason);
  }

  // Notify new agent
  await notifyUser(
    replacementAgent.user,
    `New Customer Lead: You have been assigned to buyer for "${unlock.agentListing.title}" in ${prop.locality ?? prop.city}. Customer Phone: ${unlock.buyer.phone ?? "Registered User"}.`,
    "Lead Reassigned to You"
  );

  // Notify customer
  await notifyUser(
    unlock.buyer,
    `Your request to switch agent was approved. New Agent: ${replacementAgent.shopName || "Prime Agent"} (Code: ${replacementAgent.agentCode}). Contact: ${replacementAgent.user.phone || "Available in app"}.`,
    "Agent Switched Successfully"
  );

  return {
    success: true,
    previousAgentId: currentAgentId,
    newAgent: {
      id: replacementAgent.id,
      agentCode: replacementAgent.agentCode,
      shopName: replacementAgent.shopName,
      phone: replacementAgent.user.phone,
      ratingAvg: replacementAgent.ratingAvg,
    },
  };
}
