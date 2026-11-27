import { prisma } from "@/lib/prisma";
import { haversineDistanceKm } from "@/lib/geo";

// How fresh a GPS ping has to be to count as the agent's "live" position on
// the map. Older than this (or never reported) falls back to the agent's
// fixed shop location, which every approved agent already has.
const LIVE_FRESH_MS = 15 * 60 * 1000;

export type LiveMapAgent = {
  id: string;
  agentCode: string | null;
  name: string;
  phone: string | null;
  shopName: string | null;
  latitude: number | null;
  longitude: number | null;
  isLive: boolean;
  lastSeenAt: string | null;
};

export type LiveMapVisit = {
  id: string;
  buyerName: string;
  buyerPhone: string | null;
  agentId: string;
  agentName: string;
  propertyLabel: string;
  propertyLatitude: number;
  propertyLongitude: number;
  scheduledAt: string;
  status: string;
  distanceKm: number | null;
};

export type LiveMapData = {
  agents: LiveMapAgent[];
  visits: LiveMapVisit[];
  generatedAt: string;
};

function bestAgentPosition(agent: {
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastLocationAt: Date | null;
  shopLatitude: number | null;
  shopLongitude: number | null;
}) {
  const isLive =
    agent.lastLatitude != null &&
    agent.lastLongitude != null &&
    agent.lastLocationAt != null &&
    Date.now() - agent.lastLocationAt.getTime() <= LIVE_FRESH_MS;

  if (isLive) return { latitude: agent.lastLatitude!, longitude: agent.lastLongitude!, isLive: true };
  if (agent.shopLatitude != null && agent.shopLongitude != null) {
    return { latitude: agent.shopLatitude, longitude: agent.shopLongitude, isLive: false };
  }
  return { latitude: null, longitude: null, isLive: false };
}

export async function getLiveMapData(): Promise<LiveMapData> {
  const [agents, visits] = await Promise.all([
    prisma.agentProfile.findMany({
      where: { status: "APPROVED" },
      select: {
        id: true,
        agentCode: true,
        shopName: true,
        shopLatitude: true,
        shopLongitude: true,
        lastLatitude: true,
        lastLongitude: true,
        lastLocationAt: true,
        user: { select: { name: true, phone: true } },
      },
      orderBy: { agentCode: "asc" },
    }),
    prisma.visitAppointment.findMany({
      where: { status: "SCHEDULED", masterProperty: { isNot: null } },
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        buyer: { select: { name: true, phone: true } },
        agent: {
          select: {
            id: true,
            shopLatitude: true,
            shopLongitude: true,
            lastLatitude: true,
            lastLongitude: true,
            lastLocationAt: true,
            user: { select: { name: true } },
          },
        },
        masterProperty: { select: { city: true, locality: true, latitude: true, longitude: true } },
      },
      orderBy: { scheduledAt: "asc" },
    }),
  ]);

  const mappedAgents: LiveMapAgent[] = agents.map((a) => {
    const pos = bestAgentPosition(a);
    return {
      id: a.id,
      agentCode: a.agentCode,
      name: a.user.name,
      phone: a.user.phone,
      shopName: a.shopName,
      latitude: pos.latitude,
      longitude: pos.longitude,
      isLive: pos.isLive,
      lastSeenAt: a.lastLocationAt ? a.lastLocationAt.toISOString() : null,
    };
  });

  const mappedVisits: LiveMapVisit[] = visits
    .filter((v) => v.masterProperty)
    .map((v) => {
      const pos = bestAgentPosition(v.agent);
      const distanceKm =
        pos.latitude != null && pos.longitude != null
          ? haversineDistanceKm(
              { latitude: pos.latitude, longitude: pos.longitude },
              { latitude: v.masterProperty!.latitude, longitude: v.masterProperty!.longitude }
            )
          : null;

      return {
        id: v.id,
        buyerName: v.buyer.name,
        buyerPhone: v.buyer.phone,
        agentId: v.agent.id,
        agentName: v.agent.user.name,
        propertyLabel: [v.masterProperty!.locality, v.masterProperty!.city].filter(Boolean).join(", "),
        propertyLatitude: v.masterProperty!.latitude,
        propertyLongitude: v.masterProperty!.longitude,
        scheduledAt: v.scheduledAt.toISOString(),
        status: v.status,
        distanceKm: distanceKm != null ? Math.round(distanceKm * 10) / 10 : null,
      };
    });

  return { agents: mappedAgents, visits: mappedVisits, generatedAt: new Date().toISOString() };
}
