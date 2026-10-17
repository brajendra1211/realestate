import { prisma } from "@/lib/prisma";
import { emitToAgent } from "@/lib/socket";
import { sendPushToUser } from "@/lib/push";

export class PropertyRingError extends Error {}

// "Din mein 2 baar" — per buyer, per saved property. A rolling 24h window
// (counted from PropertyRingLog rows) rather than a calendar-day reset, same
// convention as canSwitchAgent's since24h in src/lib/agentSwitch.ts.
const MAX_RINGS_PER_DAY = 2;
const RING_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function getListingAgent(propertyId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      owner: {
        select: { agentProfile: { select: { id: true, userId: true, agentCode: true, shopName: true } } },
      },
    },
  });
  return property?.owner.agentProfile ?? null;
}

export async function getRingsUsedToday(buyerId: string, propertyId: string) {
  const since = new Date(Date.now() - RING_WINDOW_MS);
  return prisma.propertyRingLog.count({ where: { buyerId, propertyId, createdAt: { gte: since } } });
}

export async function getRingsRemainingToday(buyerId: string, propertyId: string) {
  const used = await getRingsUsedToday(buyerId, propertyId);
  return Math.max(0, MAX_RINGS_PER_DAY - used);
}

export async function ringProperty(buyerId: string, propertyId: string) {
  const saved = await prisma.savedProperty.findUnique({
    where: { userId_propertyId: { userId: buyerId, propertyId } },
  });
  if (!saved) throw new PropertyRingError("notSaved");

  const agent = await getListingAgent(propertyId);
  if (!agent) throw new PropertyRingError("noChannelPartner");

  const usedToday = await getRingsUsedToday(buyerId, propertyId);
  if (usedToday >= MAX_RINGS_PER_DAY) throw new PropertyRingError("dailyLimitReached");

  const [buyer, property] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: buyerId }, select: { name: true } }),
    prisma.property.findUniqueOrThrow({ where: { id: propertyId }, select: { title: true } }),
  ]);

  await prisma.propertyRingLog.create({ data: { buyerId, propertyId } });

  const payload = { propertyId, propertyTitle: property.title, buyerName: buyer.name };
  emitToAgent(agent.id, "property-ring", payload);
  await sendPushToUser(
    agent.userId,
    { title: "Buyer is ringing you", body: `${buyer.name} wants to talk about "${property.title}".` },
    { type: "property-ring", propertyId }
  );

  return { ringsRemaining: MAX_RINGS_PER_DAY - usedToday - 1 };
}
