import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";
import { sendPushToUser } from "@/lib/push";
import { emitToAgent } from "@/lib/socket";
import { findNearbyAgents, agentPoint } from "@/lib/agentGeo";
import { filterAgentIdsByAlert } from "@/lib/agentAlerts";
import { haversineDistanceKm } from "@/lib/geo";
import { absoluteUrl } from "@/lib/seo";
import { listingBriefFor } from "@/lib/listingBrief";
import type { BuyerInterest } from "@/generated/prisma";

/**
 * The buzzer after a buyer pays the unlock fee on a listing.
 *   0s   -> the listing's own partner
 *   10s  -> every Prime partner within 5 km  ("a buyer wants a property like this")
 *   60s  -> within 15 km  (fallback)
 *   180s -> every Prime partner (last fallback)
 * The first partner to accept gets the buyer's number, and the buyer can then open
 * ALL of that partner's listings through the partner's shop link.
 *
 * Who can see a request is computed from its age every time a partner's panel polls,
 * so the fallbacks work even if the server restarted. The in-process timers below only
 * add the push / WhatsApp / socket buzz at each step.
 */
export class BuyerInterestError extends Error {}

/** How many partners may take the same buyer (each gets the number and can show their listings). */
export const MAX_ACCEPTORS = 5;

export const PHASES = [
  { afterMs: 0, radiusKm: 0, label: "listing partner" },
  { afterMs: 10_000, radiusKm: 5, label: "5 km" },
  { afterMs: 60_000, radiusKm: 15, label: "15 km" },
  { afterMs: 180_000, radiusKm: Infinity, label: "everyone" },
] as const;

function phaseIndex(ageMs: number) {
  let idx = 0;
  PHASES.forEach((p, i) => {
    if (ageMs >= p.afterMs) idx = i;
  });
  return idx;
}

const ids = (csv: string | null | undefined) => (csv ?? "").split(",").filter(Boolean);

export const shopLink = (agentCode: string) => absoluteUrl(`/shop/${agentCode}`);

/** Called right after a buyer's unlock is saved. Never throws: the unlock must not fail because of the buzzer. */
export async function createBuyerInterest(unlockId: string) {
  try {
    const unlock = await prisma.propertyUnlock.findUnique({
      where: { id: unlockId },
      include: { agentListing: { include: { masterProperty: true } } },
    });
    if (!unlock) return null;
    const l = unlock.agentListing;

    const interest = await prisma.buyerInterest.create({
      data: {
        unlockId: unlock.id,
        buyerId: unlock.buyerId,
        agentListingId: l.id,
        primaryAgentId: l.agentId ?? null,
        latitude: l.masterProperty?.latitude ?? null,
        longitude: l.masterProperty?.longitude ?? null,
        listingTitle: l.title,
        listingCity: l.masterProperty?.city ?? null,
        listingLocality: l.masterProperty?.locality ?? null,
        listingType: l.listingType,
        propertyType: l.propertyType,
        listingPrice: l.price,
        bedrooms: l.bedrooms ?? null,
      },
    });

    await runPhase(interest.id, 0);
    scheduleEscalations(interest.id);
    return interest;
  } catch (error) {
    console.error("createBuyerInterest failed", error);
    return null;
  }
}

function scheduleEscalations(interestId: string) {
  PHASES.forEach((p, i) => {
    if (i === 0) return;
    const t = setTimeout(() => {
      runPhase(interestId, i).catch((e) => console.error("buyer interest escalation failed", e));
    }, p.afterMs);
    t.unref?.();
  });
}

function describe(i: Pick<BuyerInterest, "listingType" | "propertyType" | "bedrooms" | "listingLocality" | "listingCity" | "listingPrice">) {
  const type = i.propertyType.replace(/_/g, " ").toLowerCase();
  const bhk = i.bedrooms ? `${i.bedrooms} BHK ` : "";
  const where = [i.listingLocality, i.listingCity].filter(Boolean).join(", ");
  const price = `₹${i.listingPrice.toLocaleString("en-IN")}${i.listingType === "RENT" ? "/mo" : ""}`;
  return `${bhk}${type} for ${i.listingType === "RENT" ? "rent" : "sale"}${where ? ` in ${where}` : ""} around ${price}`;
}

async function audienceFor(interest: BuyerInterest, phase: number): Promise<string[]> {
  const p = PHASES[phase];
  if (phase === 0) return interest.primaryAgentId ? [interest.primaryAgentId] : [];
  if (p.radiusKm === Infinity || interest.latitude == null || interest.longitude == null) {
    const all = await prisma.agentProfile.findMany({ where: { status: "APPROVED", primeStatus: true }, select: { id: true }, take: 100 });
    return all.map((a) => a.id);
  }
  const near = await findNearbyAgents(interest.latitude, interest.longitude, p.radiusKm, 100);
  return near.map((n) => n.agentProfileId);
}

/** Buzz the partners that became eligible at this step (and weren't buzzed before). */
export async function runPhase(interestId: string, phase: number) {
  const interest = await prisma.buyerInterest.findUnique({ where: { id: interestId }, include: { _count: { select: { acceptances: true } } } });
  if (!interest || interest.status === "CLOSED" || interest._count.acceptances >= MAX_ACCEPTORS) return 0;

  const already = new Set(ids(interest.notifiedAgentIds));
  const audience = await filterAgentIdsByAlert(
    (await audienceFor(interest, phase)).filter((id) => !already.has(id)),
    "buzzerAlerts",
  );
  if (audience.length === 0) return 0;

  await prisma.buyerInterest.update({
    where: { id: interest.id },
    data: { notifiedAgentIds: [...already, ...audience].join(","), buzzCount: { increment: 1 } },
  });

  const agents = await prisma.agentProfile.findMany({
    where: { id: { in: audience }, status: "APPROVED", primeStatus: true },
    include: { user: { select: { id: true, phone: true, email: true } } },
  });
  const isPrimary = (id: string) => id === interest.primaryAgentId;
  await Promise.all(
    agents.map(async (a) => {
      const text = isPrimary(a.id)
        ? `A buyer just paid to unlock your listing "${interest.listingTitle}". Open Buyer Leads, accept and call them now.`
        : `A buyer wants a property like this: ${describe(interest)}. Open Buyer Leads and accept first to get their number and show your listings.`;
      emitToAgent(a.id, "buyer-interest:new", { id: interest.id });
      await sendPushToUser(a.user.id, { title: "Buyer wants to see a property", body: text }, { type: "buyer-interest", interestId: interest.id }).catch(() => {});
      await notifyUser(a.user, text, "Buyer wants to see a property").catch(() => {});
    }),
  );
  return agents.length;
}

export type VisibleInterest = {
  id: string;
  title: string;
  summary: string;
  where: string;
  price: number;
  kind: string;
  listedBy: string;
  listedByLabel: string;
  distanceKm: number | null;
  stage: string;
  primary: boolean;
  buzzCount: number;
  createdAt: Date;
};

/** The open buyer requests this partner can see right now (no buyer contact included). */
export async function visibleInterestsForAgent(agentProfileId: string): Promise<VisibleInterest[]> {
  const agent = await prisma.agentProfile.findUnique({
    where: { id: agentProfileId },
    select: { status: true, primeStatus: true, shopLatitude: true, shopLongitude: true, user: { select: { liveLatitude: true, liveLongitude: true, liveLocationAt: true } } },
  });
  if (!agent || agent.status !== "APPROVED" || !agent.primeStatus) return [];

  // Still open to take while fewer than MAX_ACCEPTORS partners have, and not already taken by this partner.
  const open = await prisma.buyerInterest.findMany({
    where: {
      status: { in: ["OPEN", "ACCEPTED"] },
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      acceptances: { none: { agentId: agentProfileId } },
    },
    include: { _count: { select: { acceptances: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const now = Date.now();
  const visible = open.filter((i) => i._count.acceptances < MAX_ACCEPTORS && canSee(i, agentProfileId, agent, now));
  return Promise.all(
    visible.map(async (i) => {
      const brief = await listingBriefFor(i.agentListingId, agentProfileId);
      const here = agentPoint(agent);
      const distanceKm =
        i.latitude != null && i.longitude != null && here
          ? Math.round(haversineDistanceKm(here, { latitude: i.latitude, longitude: i.longitude }) * 10) / 10
          : null;
      const phase = PHASES[phaseIndex(now - i.createdAt.getTime())];
      return {
        id: i.id,
        title: i.listingTitle,
        summary: describe(i),
        where: [i.listingLocality, i.listingCity].filter(Boolean).join(", "),
        price: i.listingPrice,
        kind: `${i.bedrooms ? `${i.bedrooms} BHK ` : ""}${i.propertyType.replace(/_/g, " ").toLowerCase()} for ${i.listingType === "RENT" ? "rent" : "sale"}`,
        listedBy: brief?.listedBy ?? "ADMIN",
        listedByLabel: brief?.listedByLabel ?? "Company (admin) listing",
        distanceKm,
        stage: phase.radiusKm === 0 ? "Listing partner" : phase.radiusKm === Infinity ? "All partners" : `Within ${phase.radiusKm} km`,
        primary: i.primaryAgentId === agentProfileId,
        buzzCount: i.buzzCount,
        createdAt: i.createdAt,
      };
    }),
  );
}

function canSee(
  i: BuyerInterest,
  agentProfileId: string,
  agent: Parameters<typeof agentPoint>[0],
  now = Date.now(),
) {
  if (i.primaryAgentId === agentProfileId) return true;
  // Partners the admin buzzed on purpose (or an earlier phase already buzzed) can always see it.
  if (ids(i.notifiedAgentIds).includes(agentProfileId)) return true;
  const phase = phaseIndex(now - i.createdAt.getTime());
  if (phase === 0) return false;
  const radius = PHASES[phase].radiusKm;
  if (radius === Infinity) return true;
  if (i.latitude == null || i.longitude == null) return true; // listing has no location: open to all after 10s
  const here = agentPoint(agent);
  if (!here) return false;
  return haversineDistanceKm(here, { latitude: i.latitude, longitude: i.longitude }) <= radius;
}

/** Any eligible partner can accept, up to MAX_ACCEPTORS of them; each gets the buyer's number. */
export async function acceptBuyerInterest(interestId: string, agentProfileId: string) {
  const interest = await prisma.buyerInterest.findUnique({ where: { id: interestId }, include: { _count: { select: { acceptances: true } } } });
  if (!interest) throw new BuyerInterestError("Request not found.");
  if (interest.status === "CLOSED") throw new BuyerInterestError("This request has been closed.");
  const agent = await prisma.agentProfile.findUnique({
    where: { id: agentProfileId },
    select: { status: true, primeStatus: true, shopLatitude: true, shopLongitude: true, user: { select: { liveLatitude: true, liveLongitude: true, liveLocationAt: true } } },
  });
  if (!agent || agent.status !== "APPROVED" || !agent.primeStatus) {
    throw new BuyerInterestError("Only active Prime partners can accept buyer requests.");
  }
  if (!canSee(interest, agentProfileId, agent)) throw new BuyerInterestError("This request is not available to you yet.");
  if (interest._count.acceptances >= MAX_ACCEPTORS) {
    throw new BuyerInterestError(`${MAX_ACCEPTORS} partners have already taken this buyer.`);
  }

  try {
    await prisma.buyerInterestAcceptance.create({ data: { interestId, agentId: agentProfileId } });
  } catch {
    throw new BuyerInterestError("You have already accepted this buyer.");
  }
  // The first acceptor is recorded on the request itself; the status flips to ACCEPTED.
  await prisma.buyerInterest.updateMany({
    where: { id: interestId, status: "OPEN" },
    data: { status: "ACCEPTED", acceptedByAgentId: agentProfileId, acceptedAt: new Date() },
  });

  const total = await prisma.buyerInterestAcceptance.count({ where: { interestId } });
  if (total >= MAX_ACCEPTORS) {
    for (const other of ids(interest.notifiedAgentIds).filter((x) => x !== agentProfileId)) {
      emitToAgent(other, "buyer-interest:taken", { id: interestId });
    }
  }
  return prisma.buyerInterest.findUniqueOrThrow({ where: { id: interestId } });
}

/** Admin: buzz everyone again / assign a partner / close. */
export async function adminRebuzzInterest(interestId: string) {
  const interest = await prisma.buyerInterest.findUniqueOrThrow({ where: { id: interestId } });
  if (interest.status === "CLOSED") throw new BuyerInterestError("This request is closed.");
  await prisma.buyerInterest.update({ where: { id: interestId }, data: { notifiedAgentIds: null } });
  return runPhase(interestId, PHASES.length - 1);
}

/**
 * Admin: buzz ONLY the chosen partners (no widening to other partners).
 * Returns how many approved Prime partners were actually buzzed.
 */
export async function adminBuzzSelectedAgents(interestId: string, agentProfileIds: string[]) {
  const interest = await prisma.buyerInterest.findUniqueOrThrow({ where: { id: interestId } });
  if (interest.status === "CLOSED") throw new BuyerInterestError("This request is closed.");

  const agents = await prisma.agentProfile.findMany({
    where: { id: { in: [...new Set(agentProfileIds)] }, status: "APPROVED", primeStatus: true, buzzerAlerts: true },
    include: { user: { select: { id: true, phone: true, email: true } } },
  });
  if (agents.length === 0) throw new BuyerInterestError("No eligible partner selected (must be approved Prime with buzzer alerts ON).");

  const already = new Set(ids(interest.notifiedAgentIds));
  agents.forEach((a) => already.add(a.id));
  await prisma.buyerInterest.update({
    where: { id: interestId },
    data: { notifiedAgentIds: [...already].join(","), buzzCount: { increment: 1 } },
  });

  await Promise.all(
    agents.map(async (a) => {
      const text = `Admin sent you a buyer request: ${describe(interest)}. Open Buyer Leads and accept to get their number.`;
      emitToAgent(a.id, "buyer-interest:new", { id: interest.id });
      await sendPushToUser(a.user.id, { title: "Buyer wants to see a property", body: text }, { type: "buyer-interest", interestId }).catch(() => {});
      await notifyUser(a.user, text, "Buyer wants to see a property").catch(() => {});
    }),
  );
  return agents.length;
}

/** Admin: buzz only the partners the admin mapped to this pincode (Area routing). */
export async function adminBuzzAreaAgents(interestId: string, pincode: string) {
  const assignments = await prisma.areaAgentAssignment.findMany({ where: { pincode: pincode.trim() }, select: { agentId: true } });
  if (assignments.length === 0) throw new BuyerInterestError(`No partners are mapped to pincode ${pincode}.`);
  return adminBuzzSelectedAgents(interestId, assignments.map((a) => a.agentId));
}

export async function adminAssignInterest(interestId: string, agentProfileId: string) {
  await prisma.buyerInterestAcceptance.upsert({
    where: { interestId_agentId: { interestId, agentId: agentProfileId } },
    create: { interestId, agentId: agentProfileId },
    update: {},
  });
  await prisma.buyerInterest.updateMany({
    where: { id: interestId, status: "OPEN" },
    data: { status: "ACCEPTED", acceptedByAgentId: agentProfileId, acceptedAt: new Date() },
  });
  const agent = await prisma.agentProfile.findUnique({ where: { id: agentProfileId }, include: { user: { select: { id: true, phone: true, email: true } } } });
  if (agent) {
    const text = "Admin assigned you a buyer who paid to see a property. Open Buyer Leads to call them and share your listings.";
    emitToAgent(agentProfileId, "buyer-interest:new", { id: interestId });
    await sendPushToUser(agent.user.id, { title: "Buyer assigned to you", body: text }, { type: "buyer-interest", interestId }).catch(() => {});
    await notifyUser(agent.user, text, "Buyer assigned to you").catch(() => {});
  }
}

export async function closeInterest(interestId: string, note?: string) {
  await prisma.buyerInterest.update({ where: { id: interestId }, data: { status: "CLOSED", adminNote: note ?? null } });
}
