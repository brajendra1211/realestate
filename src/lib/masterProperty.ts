import { prisma } from "@/lib/prisma";
import { haversineDistanceKm } from "@/lib/geo";
import { generateMasterPropertyId } from "@/lib/codes";

// "Same physical building" tightness — not "same neighbourhood". Matches the
// spec's "address/geofence match" dedup intent (docs/platform-requirements.md §3.2).
const DEDUP_RADIUS_KM = 0.2;

export type MasterPropertyCandidate = {
  id: string;
  masterId: string;
  city: string;
  locality: string | null;
  latitude: number;
  longitude: number;
  distanceKm: number;
};

export async function findNearbyMasterProperties(
  city: string,
  latitude: number,
  longitude: number
): Promise<MasterPropertyCandidate[]> {
  const sameCity = await prisma.masterProperty.findMany({ where: { city } });

  return sameCity
    .map((property) => ({
      ...property,
      distanceKm: haversineDistanceKm(
        { latitude, longitude },
        { latitude: property.latitude, longitude: property.longitude }
      ),
    }))
    .filter((property) => property.distanceKm <= DEDUP_RADIUS_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export async function getOrCreateMasterProperty(input: {
  masterPropertyId?: string | null;
  city: string;
  locality?: string | null;
  latitude: number;
  longitude: number;
}) {
  if (input.masterPropertyId) {
    const existing = await prisma.masterProperty.findUnique({ where: { id: input.masterPropertyId } });
    if (existing) return existing;
  }

  const masterId = await generateMasterPropertyId(input.city);
  return prisma.masterProperty.create({
    data: {
      masterId,
      city: input.city,
      locality: input.locality?.trim() || null,
      latitude: input.latitude,
      longitude: input.longitude,
    },
  });
}
