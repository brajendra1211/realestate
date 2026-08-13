import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { getOrCreateMasterProperty } from "@/lib/masterProperty";

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

export async function getPublicListings(filters?: { city?: string; listingType?: "SALE" | "RENT" }) {
  return prisma.agentListing.findMany({
    where: {
      ...(filters?.city ? { masterProperty: { city: filters.city } } : {}),
      ...(filters?.listingType ? { listingType: filters.listingType } : {}),
    },
    include: { images: true, masterProperty: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getListingBySlug(slug: string) {
  return prisma.agentListing.findUnique({
    where: { slug },
    include: { images: true, masterProperty: true, agent: { include: { user: true } } },
  });
}
