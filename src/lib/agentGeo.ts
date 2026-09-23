import { prisma } from "@/lib/prisma";
import { redis, isRedisConfigured } from "@/lib/redis";
import { haversineDistanceKm } from "@/lib/geo";

// One global geo set of every active Prime agent's shop location — §3.5's
// suggested stack ("Redis Geo for hot lookups"). A single key (not
// per-city) because GEOSEARCH's own BYRADIUS already scopes the query by
// distance; there's no need to know the city up front. MySQL stays the
// source of truth (AgentProfile.shopLatitude/shopLongitude) — this index is
// rebuilt from there, and every lookup falls back to a plain haversine scan
// (same pattern as src/lib/masterProperty.ts) when Redis isn't configured.
const AGENT_GEO_KEY = "geo:agents";

export async function indexAgentLocation(agentProfileId: string, latitude: number, longitude: number) {
  if (!isRedisConfigured() || !redis) return;
  await redis.geoadd(AGENT_GEO_KEY, longitude, latitude, agentProfileId);
}

export async function removeAgentFromIndex(agentProfileId: string) {
  if (!isRedisConfigured() || !redis) return;
  await redis.zrem(AGENT_GEO_KEY, agentProfileId);
}

export type NearbyAgent = { agentProfileId: string; distanceKm: number };

// Ordered nearest-first, capped at `count` (dispatch needs "5-10 nearest").
async function findNearbyAgentIdsViaRedis(
  latitude: number,
  longitude: number,
  radiusKm: number,
  count: number
): Promise<NearbyAgent[]> {
  if (!redis) return [];
  // ioredis' geosearch: GEOSEARCH key FROMLONLAT lon lat BYRADIUS r km ASC COUNT n WITHDIST
  const results = (await redis.geosearch(
    AGENT_GEO_KEY,
    "FROMLONLAT",
    longitude,
    latitude,
    "BYRADIUS",
    radiusKm,
    "km",
    "ASC",
    "COUNT",
    count,
    "WITHCOORD",
    "WITHDIST"
  )) as unknown as [string, string, [string, string]][];

  return results.map(([agentProfileId, distance]) => ({
    agentProfileId,
    distanceKm: Number(distance),
  }));
}

async function findNearbyAgentIdsViaMysql(
  latitude: number,
  longitude: number,
  radiusKm: number,
  count: number,
  excludeAgentIds: string[]
): Promise<NearbyAgent[]> {
  // Same bounding-box-then-haversine pattern as findNearbyMasterProperties.
  // No city filter — dispatch/broadcast radius search is a point+radius
  // query, not a city listing — so this scans all Prime agents with
  // coordinates. Fine at this app's scale; revisit if the agent count ever
  // makes a full table scan slow.
  const agents = await prisma.agentProfile.findMany({
    where: {
      primeStatus: true,
      shopLatitude: { not: null },
      shopLongitude: { not: null },
      id: excludeAgentIds.length ? { notIn: excludeAgentIds } : undefined,
    },
    select: { id: true, shopLatitude: true, shopLongitude: true },
  });

  return agents
    .map((agent) => ({
      agentProfileId: agent.id,
      distanceKm: haversineDistanceKm(
        { latitude, longitude },
        { latitude: agent.shopLatitude!, longitude: agent.shopLongitude! }
      ),
    }))
    .filter((agent) => agent.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, count);
}

export async function findNearbyAgents(
  latitude: number,
  longitude: number,
  radiusKm: number,
  count: number,
  excludeAgentIds: string[] = []
): Promise<NearbyAgent[]> {
  if (isRedisConfigured() && redis) {
    const nearby = await findNearbyAgentIdsViaRedis(latitude, longitude, radiusKm, count + excludeAgentIds.length);
    let filtered = nearby.filter((a) => !excludeAgentIds.includes(a.agentProfileId)).slice(0, count);

    // The Redis index can drift from MySQL (an agent demoted/removed since
    // it was last indexed, or a stray key from a stale process). Validate
    // before returning — every caller downstream creates rows with an FK to
    // AgentProfile, so a stale ID would otherwise crash the whole cascade
    // instead of just skipping one bad candidate.
    if (filtered.length > 0) {
      const live = await prisma.agentProfile.findMany({
        where: { id: { in: filtered.map((a) => a.agentProfileId) }, primeStatus: true },
        select: { id: true },
      });
      const liveIds = new Set(live.map((a) => a.id));
      filtered = filtered.filter((a) => liveIds.has(a.agentProfileId));
    }

    if (filtered.length > 0 || nearby.length > 0) return filtered;
    // Redis index exists but returned nothing (e.g. not yet backfilled) —
    // fall through to MySQL rather than reporting "no agents nearby" wrongly.
  }
  return findNearbyAgentIdsViaMysql(latitude, longitude, radiusKm, count, excludeAgentIds);
}

// Rebuilds the whole Redis index from MySQL — run this once after deploying
// Phase 4 (existing agents predate the index) and it's safe to re-run any
// time. Not wired to a schedule; call from an admin action if the index ever
// drifts from AgentProfile (e.g. after a Redis flush).
export async function reindexAllAgents() {
  if (!isRedisConfigured() || !redis) return 0;

  const agents = await prisma.agentProfile.findMany({
    where: { primeStatus: true, shopLatitude: { not: null }, shopLongitude: { not: null } },
    select: { id: true, shopLatitude: true, shopLongitude: true },
  });

  await redis.del(AGENT_GEO_KEY);
  if (agents.length === 0) return 0;

  const args = agents.flatMap((a) => [a.shopLongitude!, a.shopLatitude!, a.id]);
  await redis.geoadd(AGENT_GEO_KEY, ...args);
  return agents.length;
}
