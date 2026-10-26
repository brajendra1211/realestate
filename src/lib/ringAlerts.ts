import { prisma } from "@/lib/prisma";

export type RingAlert = {
  id: string;
  listingTitle: string;
  buyerName: string;
  buyerPhone: string | null;
  createdAt: Date;
};

// Live delivery (Socket.io / Firebase push — src/lib/propertyRing.ts,
// src/lib/agentListingRing.ts) only reaches an agent whose dashboard tab is
// open or who has the mobile app installed and logged in at that exact
// moment — nothing persists it anywhere else. An agent who was offline when
// a buyer rang had no way to ever find out. This reads both ring-log tables
// (Property's via the owner->agentProfile indirection, AgentListing's via
// its direct agentId) back out, merged and sorted, as an always-available
// history regardless of whether the live alert was seen.
export async function getRingAlertsForAgent(agentProfileId: string, take = 20): Promise<RingAlert[]> {
  const [propertyRings, agentListingRings] = await Promise.all([
    prisma.propertyRingLog.findMany({
      where: { property: { owner: { agentProfile: { id: agentProfileId } } } },
      include: { property: { select: { title: true } }, buyer: { select: { name: true, phone: true } } },
      orderBy: { createdAt: "desc" },
      take,
    }),
    prisma.agentListingRingLog.findMany({
      where: { agentListing: { agentId: agentProfileId } },
      include: { agentListing: { select: { title: true } }, buyer: { select: { name: true, phone: true } } },
      orderBy: { createdAt: "desc" },
      take,
    }),
  ]);

  const merged: RingAlert[] = [
    ...propertyRings.map((r) => ({
      id: r.id,
      listingTitle: r.property.title,
      buyerName: r.buyer.name,
      buyerPhone: r.buyer.phone,
      createdAt: r.createdAt,
    })),
    ...agentListingRings.map((r) => ({
      id: r.id,
      listingTitle: r.agentListing.title,
      buyerName: r.buyer.name,
      buyerPhone: r.buyer.phone,
      createdAt: r.createdAt,
    })),
  ];

  return merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, take);
}
