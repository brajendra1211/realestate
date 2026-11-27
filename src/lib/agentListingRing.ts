import { prisma } from "@/lib/prisma";
import { emitToAgent } from "@/lib/socket";
import { sendPushToUser } from "@/lib/push";
import { buyerHasPaidAccess } from "@/lib/access";
import { listingBriefFor, briefWhere } from "@/lib/listingBrief";

export class AgentListingRingError extends Error {}

// Mirrors src/lib/propertyRing.ts's cap — AgentListing already has a direct
// agentId, so this skips that file's owner->agentProfile indirection
// entirely, but the buyer-facing rule ("must be saved first") is identical.
const MAX_RINGS_PER_DAY = 50;
const RING_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function getAgentListingRingsUsedToday(buyerId: string, agentListingId: string) {
  const since = new Date(Date.now() - RING_WINDOW_MS);
  return prisma.agentListingRingLog.count({ where: { buyerId, agentListingId, createdAt: { gte: since } } });
}

export async function getAgentListingRingsRemainingToday(buyerId: string, agentListingId: string) {
  const used = await getAgentListingRingsUsedToday(buyerId, agentListingId);
  return Math.max(0, MAX_RINGS_PER_DAY - used);
}

export async function ringAgentListing(buyerId: string, agentListingId: string) {
  const saved = await prisma.savedAgentListing.findUnique({
    where: { userId_agentListingId: { userId: buyerId, agentListingId } },
  });
  if (!saved) {
    // A buyer who has paid once has every listing open, so ringing does not need a separate "save".
    if (!(await buyerHasPaidAccess(buyerId))) throw new AgentListingRingError("notSaved");
    await prisma.savedAgentListing.upsert({
      where: { userId_agentListingId: { userId: buyerId, agentListingId } },
      create: { userId: buyerId, agentListingId },
      update: {},
    });
  }

  const listing = await prisma.agentListing.findUnique({
    where: { id: agentListingId },
    select: { title: true, agent: { select: { id: true, userId: true } } },
  });
  if (!listing?.agent) throw new AgentListingRingError("noChannelPartner");

  const usedToday = await getAgentListingRingsUsedToday(buyerId, agentListingId);
  if (usedToday >= MAX_RINGS_PER_DAY) throw new AgentListingRingError("dailyLimitReached");

  const buyer = await prisma.user.findUniqueOrThrow({
    where: { id: buyerId },
    select: { name: true, phone: true },
  });

  await prisma.agentListingRingLog.create({ data: { buyerId, agentListingId } });

  const brief = await listingBriefFor(agentListingId, listing.agent.id);
  const payload = { propertyId: agentListingId, propertyTitle: listing.title, buyerName: buyer.name };
  emitToAgent(listing.agent.id, "property-ring", payload);
  await sendPushToUser(
    listing.agent.userId,
    { title: "Buyer is ringing you", body: `${buyer.name} wants to talk about "${listing.title}".` },
    {
      type: "property-ring",
      propertyId: agentListingId,
      propertyTitle: listing.title,
      buyerName: buyer.name,
      buyerPhone: buyer.phone ?? "",
      propertyWhere: brief ? briefWhere(brief) : "",
      propertyPrice: brief ? String(brief.price) : "",
      propertyKind: brief ? `${brief.bedrooms ? `${brief.bedrooms} BHK ` : ""}${brief.propertyType.replace(/_/g, " ").toLowerCase()} for ${brief.listingType === "RENT" ? "rent" : "sale"}` : "",
      listedBy: brief?.listedByLabel ?? "",
    }
  );

  return { ringsRemaining: MAX_RINGS_PER_DAY - usedToday - 1 };
}
