import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";
import { sendPushToUser } from "@/lib/push";
import { haversineDistanceKm } from "@/lib/geo";

export class WatchError extends Error {}

export type WatchInput = {
  buyerId: string;
  purpose?: string; // RENT | BUY
  bhk?: number | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  societyName?: string | null;
  latitude: number;
  longitude: number;
  radiusKm?: number;
};

/** Requirement hold: no property within the radius, so keep it on the active watch-list. */
export async function createWatchRequirement(input: WatchInput) {
  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) {
    throw new WatchError("Location is required.");
  }
  const radiusKm = Math.min(Math.max(Math.round(input.radiusKm ?? 5), 1), 5);
  return prisma.watchRequirement.create({
    data: {
      buyerId: input.buyerId,
      purpose: input.purpose === "BUY" ? "BUY" : "RENT",
      bhk: input.bhk ?? null,
      budgetMin: input.budgetMin ?? null,
      budgetMax: input.budgetMax ?? null,
      societyName: input.societyName?.trim() || null,
      latitude: input.latitude,
      longitude: input.longitude,
      radiusKm,
    },
  });
}

export function listWatchForBuyer(buyerId: string) {
  return prisma.watchRequirement.findMany({ where: { buyerId }, orderBy: { createdAt: "desc" } });
}

export async function cancelWatch(buyerId: string, id: string) {
  await prisma.watchRequirement.updateMany({ where: { id, buyerId, status: "ACTIVE" }, data: { status: "CANCELLED" } });
}

/**
 * Matching engine: call whenever an AgentListing goes live. Every ACTIVE requirement whose radius
 * covers the listing (and whose BHK / budget / society fit) is marked MATCHED, the customer gets the
 * agent's details and the agent gets the customer's details.
 */
export async function matchListingToWatches(agentListingId: string) {
  const listing = await prisma.agentListing.findUnique({
    where: { id: agentListingId },
    include: {
      masterProperty: true,
      agent: { select: { id: true, agentCode: true, user: { select: { id: true, name: true, phone: true, email: true } } } },
    },
  });
  if (!listing || listing.approvalStatus !== "APPROVED" || listing.isDelisted) return 0;

  const purpose = listing.listingType === "SALE" ? "BUY" : "RENT";
  const active = await prisma.watchRequirement.findMany({ where: { status: "ACTIVE", purpose } });
  let matched = 0;

  for (const w of active) {
    const km = haversineDistanceKm(
      { latitude: w.latitude, longitude: w.longitude },
      { latitude: listing.masterProperty.latitude, longitude: listing.masterProperty.longitude }
    );
    if (km > w.radiusKm) continue;
    if (w.bhk && listing.bedrooms && listing.bedrooms !== w.bhk) continue;
    if (w.budgetMax && listing.price > w.budgetMax) continue;
    if (w.budgetMin && listing.price < w.budgetMin) continue;
    if (w.societyName && listing.societyName && !listing.societyName.toLowerCase().includes(w.societyName.toLowerCase())) continue;

    // Atomic claim so two listings can't both match the same requirement.
    const claimed = await prisma.watchRequirement.updateMany({
      where: { id: w.id, status: "ACTIVE" },
      data: { status: "MATCHED", matchedListingId: listing.id, matchedAgentId: listing.agentId, matchedAt: new Date() },
    });
    if (claimed.count === 0) continue;
    matched++;

    await notifyMatch(w.buyerId, listing);
  }
  return matched;
}

type MatchListing = {
  id: string;
  title: string;
  price: number;
  agent: { agentCode: string | null; user: { id: string; name: string; phone: string | null; email: string | null } } | null;
};

async function notifyMatch(buyerId: string, listing: MatchListing) {
  const buyer = await prisma.user.findUnique({
    where: { id: buyerId },
    select: { id: true, name: true, phone: true, email: true },
  });
  if (!buyer) return;
  const agentUser = listing.agent?.user;
  const agentLine = agentUser
    ? `Agent: ${agentUser.name}${agentUser.phone ? `, ${agentUser.phone}` : ""}${listing.agent?.agentCode ? ` (${listing.agent.agentCode})` : ""}`
    : "Our team will contact you.";

  const buyerMsg = `Good news! A property matching your requirement is now available: "${listing.title}" (Rs ${listing.price.toLocaleString("en-IN")}). ${agentLine}`;
  await notifyUser(buyer, buyerMsg, "Your requirement has a match");
  await sendPushToUser(buyer.id, { title: "Property matched", body: buyerMsg }, { type: "watch_match", listingId: listing.id }).catch(() => {});

  if (agentUser) {
    const agentMsg = `A customer is looking for a property like "${listing.title}". Customer: ${buyer.name}${buyer.phone ? `, ${buyer.phone}` : ""}.`;
    await notifyUser(agentUser, agentMsg, "New customer match");
    await sendPushToUser(agentUser.id, { title: "Customer match", body: agentMsg }, { type: "watch_match", listingId: listing.id }).catch(() => {});
  }
}

/** Open requirements an agent can answer with "I have a property". */
export async function listOpenWatchesForAgent() {
  const rows = await prisma.watchRequirement.findMany({ where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 100 });
  return rows.map((w) => ({
    id: w.id, purpose: w.purpose, bhk: w.bhk, budgetMin: w.budgetMin, budgetMax: w.budgetMax,
    societyName: w.societyName, radiusKm: w.radiusKm, createdAt: w.createdAt,
  }));
}

/** Agent says "I have a property" for a requirement (optionally pointing at one of their own listings). */
export async function claimWatchForAgent(watchId: string, agentId: string, listingId?: string | null) {
  const agent = await prisma.agentProfile.findUnique({
    where: { id: agentId },
    select: { agentCode: true, user: { select: { id: true, name: true, phone: true, email: true } } },
  });
  if (!agent) throw new WatchError("Agent not found.");
  const own = listingId
    ? await prisma.agentListing.findFirst({ where: { id: listingId, agentId }, select: { id: true, title: true, price: true } })
    : null;
  if (listingId && !own) throw new WatchError("That listing is not yours.");

  const claimed = await prisma.watchRequirement.updateMany({
    where: { id: watchId, status: "ACTIVE" },
    data: { status: "MATCHED", matchedListingId: own?.id ?? null, matchedAgentId: agentId, matchedAt: new Date() },
  });
  if (claimed.count === 0) throw new WatchError("This requirement is no longer open.");
  const w = await prisma.watchRequirement.findUniqueOrThrow({ where: { id: watchId } });
  await notifyMatch(w.buyerId, {
    id: own?.id ?? "",
    title: own?.title ?? "a property for you",
    price: own?.price ?? 0,
    agent,
  });
}

/** Same as matchListingToWatches, for a website Property once admin approves it. */
export async function matchPropertyToWatches(propertyId: string) {
  const p = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      assignedAgent: { select: { agentCode: true, user: { select: { id: true, name: true, phone: true, email: true } } } },
    },
  });
  if (!p || p.approvalStatus !== "APPROVED" || p.latitude == null || p.longitude == null) return 0;
  const purpose = p.listingType === "SALE" ? "BUY" : "RENT";
  const active = await prisma.watchRequirement.findMany({ where: { status: "ACTIVE", purpose } });
  let matched = 0;
  for (const w of active) {
    const km = haversineDistanceKm({ latitude: w.latitude, longitude: w.longitude }, { latitude: p.latitude, longitude: p.longitude });
    if (km > w.radiusKm) continue;
    if (w.bhk && p.bedrooms && p.bedrooms !== w.bhk) continue;
    if (w.budgetMax && p.price > w.budgetMax) continue;
    if (w.budgetMin && p.price < w.budgetMin) continue;
    const claimed = await prisma.watchRequirement.updateMany({
      where: { id: w.id, status: "ACTIVE" },
      data: { status: "MATCHED", matchedAgentId: p.assignedAgentId ?? null, matchedAt: new Date() },
    });
    if (claimed.count === 0) continue;
    matched++;
    await notifyMatch(w.buyerId, { id: p.id, title: p.title, price: p.price, agent: p.assignedAgent ?? null });
  }
  return matched;
}
