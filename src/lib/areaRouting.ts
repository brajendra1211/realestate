import { prisma } from "@/lib/prisma";
import { reverseGeocodePincode } from "@/lib/geocode";
import type { NearbyAgent } from "@/lib/agentGeo";

export class AreaRoutingServiceError extends Error {}

// "Company har Pincode ya Area Code ko specific Agents ke IDs ke sath link
// (map) kar deti hai" — Agent Registration doc, "Company Rules (Area-Wise
// Auto Allocation)". Admin-managed pincode -> agent overrides on top of the
// default radius search.
export async function createAreaAssignment(pincode: string, agentId: string) {
  const trimmed = pincode.trim();
  if (!trimmed || !agentId) throw new AreaRoutingServiceError("validation");

  const agent = await prisma.agentProfile.findUnique({ where: { id: agentId } });
  if (!agent) throw new AreaRoutingServiceError("agentNotFound");

  const existing = await prisma.areaAgentAssignment.findUnique({
    where: { pincode_agentId: { pincode: trimmed, agentId } },
  });
  if (existing) throw new AreaRoutingServiceError("duplicate");

  return prisma.areaAgentAssignment.create({ data: { pincode: trimmed, agentId } });
}

export async function deleteAreaAssignment(id: string) {
  await prisma.areaAgentAssignment.delete({ where: { id } });
}

export async function listAreaAssignments() {
  return prisma.areaAgentAssignment.findMany({
    include: { agent: { select: { agentCode: true, shopName: true, user: { select: { name: true } } } } },
    orderBy: [{ pincode: "asc" }, { createdAt: "asc" }],
  });
}

// Dispatch's pincode-override lookup — src/lib/dispatch.ts calls this before
// falling back to radius search on the first batch of a new dispatch. Only
// currently-Prime, approved agents are dispatch-eligible, same gate
// findNearbyAgents applies, so a demoted agent's old area assignment doesn't
// silently swallow a lead nobody will ever see.
export async function findAssignedAgentsForLocation(
  latitude: number,
  longitude: number,
  excludeAgentIds: string[] = []
): Promise<NearbyAgent[]> {
  // Skip the reverse-geocode network call entirely when the admin hasn't
  // configured any area assignments — the common case, and every dispatch
  // batch would otherwise pay Nominatim's latency for nothing.
  const anyAssignments = await prisma.areaAgentAssignment.findFirst({ select: { id: true } });
  if (!anyAssignments) return [];

  const pincode = await reverseGeocodePincode(latitude, longitude);
  if (!pincode) return [];

  const assignments = await prisma.areaAgentAssignment.findMany({
    where: {
      pincode,
      agentId: excludeAgentIds.length ? { notIn: excludeAgentIds } : undefined,
      agent: { status: "APPROVED", primeStatus: true },
    },
    select: { agentId: true },
  });

  // distanceKm has no real meaning for an area-code match (not a radius
  // search) — 0 so it sorts first if ever merged with radius results, and so
  // callers that just log/display distance don't choke on NaN/undefined.
  return assignments.map((a) => ({ agentProfileId: a.agentId, distanceKm: 0 }));
}
