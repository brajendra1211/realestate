import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";
import { haversineDistanceKm } from "@/lib/geo";

// §3.2: "Prime agents get a daily digest: today, in a 1-10 km radius, X new
// listings were added, in these societies, these configs (2BHK/3BHK)."
const DIGEST_RADIUS_KM = 10;

export type DigestGroup = { locality: string; bedrooms: number | null; count: number };

export type AgentDigest = {
  totalCount: number;
  groups: DigestGroup[];
};

export async function getNewListingsDigest(agentProfileId: string): Promise<AgentDigest> {
  const agent = await prisma.agentProfile.findUnique({ where: { id: agentProfileId } });
  if (!agent?.shopLatitude || !agent?.shopLongitude) return { totalCount: 0, groups: [] };

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const listings = await prisma.agentListing.findMany({
    where: {
      approvalStatus: "APPROVED",
      createdAt: { gte: since },
      agentId: { not: agentProfileId }, // "new listings" from other agents/customers
    },
    select: {
      bedrooms: true,
      masterProperty: { select: { locality: true, city: true, latitude: true, longitude: true } },
    },
  });

  const nearby = listings.filter(
    (l) =>
      haversineDistanceKm(
        { latitude: agent.shopLatitude!, longitude: agent.shopLongitude! },
        { latitude: l.masterProperty.latitude, longitude: l.masterProperty.longitude }
      ) <= DIGEST_RADIUS_KM
  );

  const groupMap = new Map<string, DigestGroup>();
  for (const listing of nearby) {
    const locality = listing.masterProperty.locality ?? listing.masterProperty.city;
    const key = `${locality}::${listing.bedrooms ?? "NA"}`;
    const existing = groupMap.get(key);
    if (existing) existing.count += 1;
    else groupMap.set(key, { locality, bedrooms: listing.bedrooms, count: 1 });
  }

  return {
    totalCount: nearby.length,
    groups: Array.from(groupMap.values()).sort((a, b) => b.count - a.count),
  };
}

function formatDigestMessage(digest: AgentDigest) {
  const parts = digest.groups
    .slice(0, 5)
    .map((g) => `${g.count} ${g.bedrooms ? `${g.bedrooms}BHK` : ""} in ${g.locality}`.trim());
  return `📍 ${digest.totalCount} new listing${digest.totalCount === 1 ? "" : "s"} added near you today: ${parts.join(", ")}.`;
}

// Called by the daily BullMQ repeatable job (src/lib/queues/digestQueue.ts).
export async function sendDailyDigests() {
  const agents = await prisma.agentProfile.findMany({
    where: { primeStatus: true, shopLatitude: { not: null }, shopLongitude: { not: null } },
    include: { user: { select: { phone: true, email: true } } },
  });

  let sent = 0;
  for (const agent of agents) {
    const digest = await getNewListingsDigest(agent.id);
    if (digest.totalCount === 0) continue;
    await notifyUser(agent.user, formatDigestMessage(digest), "Your daily listings digest");
    sent += 1;
  }
  return sent;
}
