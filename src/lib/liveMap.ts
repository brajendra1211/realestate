import { prisma } from "@/lib/prisma";
import { agentPoint, LIVE_LOCATION_FRESH_MS } from "@/lib/agentGeo";
import { haversineDistanceKm } from "@/lib/geo";

export type AgentPresence = "online" | "recent" | "offline";

export type LiveMapAgent = {
  id: string;
  agentCode: string | null;
  name: string;
  phone: string | null;
  shopName: string | null;
  latitude: number | null;
  longitude: number | null;
  presence: AgentPresence;
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

type AgentPointSource = {
  shopLatitude: number | null;
  shopLongitude: number | null;
  user: { liveLatitude: number | null; liveLongitude: number | null; liveLocationAt: Date | null };
};

// The web/app gate pings every ~60s while a person is actually on the site
// or app (src/components/LiveLocationGate.tsx), so "online" is tight — a gap
// this small only happens while the tab/app is genuinely open right now.
// LIVE_LOCATION_FRESH_MS (12h) is agentGeo's separate "trust this over the
// shop address" threshold for dispatch, not a claim that they're online.
const ONLINE_FRESH_MS = 3 * 60 * 1000;

function presenceFor(a: AgentPointSource): AgentPresence {
  const at = a.user.liveLocationAt;
  if (!at || a.user.liveLatitude == null || a.user.liveLongitude == null) return "offline";
  const age = Date.now() - at.getTime();
  if (age < ONLINE_FRESH_MS) return "online";
  if (age < LIVE_LOCATION_FRESH_MS) return "recent";
  return "offline";
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
        user: { select: { name: true, phone: true, liveLatitude: true, liveLongitude: true, liveLocationAt: true } },
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
            user: { select: { name: true, liveLatitude: true, liveLongitude: true, liveLocationAt: true } },
          },
        },
        masterProperty: { select: { city: true, locality: true, latitude: true, longitude: true } },
      },
      orderBy: { scheduledAt: "asc" },
    }),
  ]);

  const mappedAgents: LiveMapAgent[] = agents.map((a) => {
    const point = agentPoint(a);
    return {
      id: a.id,
      agentCode: a.agentCode,
      name: a.user.name,
      phone: a.user.phone,
      shopName: a.shopName,
      latitude: point?.latitude ?? null,
      longitude: point?.longitude ?? null,
      presence: presenceFor(a),
      lastSeenAt: a.user.liveLocationAt ? a.user.liveLocationAt.toISOString() : null,
    };
  });

  const mappedVisits: LiveMapVisit[] = visits
    .filter((v) => v.masterProperty)
    .map((v) => {
      const point = agentPoint(v.agent);
      const distanceKm = point
        ? haversineDistanceKm(point, { latitude: v.masterProperty!.latitude, longitude: v.masterProperty!.longitude })
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
