import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { getOrCreateMasterProperty } from "@/lib/masterProperty";
import { getNearbyAmenities, formatAmenitiesNote } from "@/lib/amenityLookup";

export class ListingServiceError extends Error {}

async function uniqueListingSlug(title: string) {
  const base = slugify(title) || "listing";
  let slug = base;
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.agentListing.findUnique({ where: { slug } });
    if (!existing) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

export type CreateAgentListingInput = {
  masterPropertyId?: string | null;
  city: string;
  locality?: string | null;
  latitude: number;
  longitude: number;
  title: string;
  description: string;
  listingType: "SALE" | "RENT";
  propertyType: "APARTMENT" | "VILLA" | "INDEPENDENT_HOUSE" | "PLOT" | "COMMERCIAL" | "OFFICE";
  bedrooms?: number | null;
  bathrooms?: number | null;
  areaSqft?: number | null;
  price: number;
  exactAddress: string;
  amenities?: string | null;
  images: string[];
};

export async function createAgentListing(agentProfileId: string, input: CreateAgentListingInput) {
  const title = input.title.trim();
  if (!title || !input.description.trim() || !input.exactAddress.trim()) {
    throw new ListingServiceError("validation");
  }
  if (!Number.isFinite(input.price) || input.price <= 0) {
    throw new ListingServiceError("validation");
  }
  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) {
    throw new ListingServiceError("noLocation");
  }

  const masterProperty = await getOrCreateMasterProperty({
    masterPropertyId: input.masterPropertyId,
    city: input.city,
    locality: input.locality,
    latitude: input.latitude,
    longitude: input.longitude,
  });

  // §3.15 — "agent never types this manually." Best-effort: a slow/down
  // Overpass API returns [] rather than blocking listing creation.
  const nearby = await getNearbyAmenities(input.latitude, input.longitude);

  return prisma.agentListing.create({
    data: {
      masterPropertyId: masterProperty.id,
      agentId: agentProfileId,
      slug: await uniqueListingSlug(title),
      title,
      description: input.description.trim(),
      listingType: input.listingType,
      propertyType: input.propertyType,
      bedrooms: input.bedrooms ?? null,
      bathrooms: input.bathrooms ?? null,
      areaSqft: input.areaSqft ?? null,
      price: input.price,
      exactAddress: input.exactAddress.trim(),
      amenities: input.amenities?.trim() || null,
      nearbyAmenities: formatAmenitiesNote(nearby),
      images: { create: input.images.map((url, order) => ({ url, order })) },
    },
    include: { images: true, masterProperty: true },
  });
}

export async function getListingsForAgent(agentProfileId: string) {
  return prisma.agentListing.findMany({
    where: { agentId: agentProfileId },
    include: { images: true, masterProperty: true, _count: { select: { unlocks: true } } },
    orderBy: { createdAt: "desc" },
  });
}

// 2-tier priority — "Top Priority (Prime Subscribed Agents): sabse pehle un
// Prime Agents ki properties top par show hongi... Second Priority
// (Radius-Based): iske baad... kisi bhi doosre agent dwara daali gayi
// listings show hongi" (client's Agent Registration doc, §"Priority Listing
// Engine"). A listing's agent may have since lost Prime (demoted) or, for a
// Gold self-listing with no referring agent, have no agent at all — both
// rank below currently-Prime agents' listings. `agent: { primeStatus: "desc" }`
// sorts true first, then false, then NULL (no agent) last — MySQL's default
// null-ordering for DESC — which is exactly this tiering, no raw SQL needed.
export async function getPublicListings(filters?: { city?: string; listingType?: "SALE" | "RENT" }) {
  return prisma.agentListing.findMany({
    where: {
      approvalStatus: "APPROVED",
      ...(filters?.city ? { masterProperty: { city: filters.city } } : {}),
      ...(filters?.listingType ? { listingType: filters.listingType } : {}),
    },
    include: { images: true, masterProperty: true },
    orderBy: [{ agent: { primeStatus: "desc" } }, { createdAt: "desc" }],
  });
}

export async function getListingBySlug(slug: string) {
  return prisma.agentListing.findUnique({
    where: { slug },
    include: { images: true, masterProperty: true, agent: { include: { user: true } } },
  });
}
