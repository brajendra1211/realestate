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
  listingPlan?: "BASIC" | "GOLD";
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

  // §3.15 — nearest Metro/Railway/Bus/Hospital/Grocery
  const nearby = await getNearbyAmenities(input.latitude, input.longitude);

  // PDF 1 P.1 & P.2: Basic (₹200 / 30d) vs Gold (₹500 / 90d) auto-delisting
  const listingPlan = input.listingPlan ?? "BASIC";
  const fee = listingPlan === "GOLD" ? 500 : 200;
  const validityDays = listingPlan === "GOLD" ? 90 : 30;
  const splitPercent = 50;
  const agentSplit = Math.round(fee * (splitPercent / 100));
  const companySplit = fee - agentSplit;

  const now = new Date();
  const listingExpiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);
  const agreementExpiryDate = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000); // 6-Month agreement

  const [listing] = await prisma.$transaction([
    prisma.agentListing.create({
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
        listingPlan,
        listingFee: fee,
        listingAgentSplit: agentSplit,
        listingCompanySplit: companySplit,
        listingExpiresAt,
        isDelisted: false,
        agreementStartDate: now,
        agreementExpiryDate,
        images: { create: input.images.map((url, order) => ({ url, order })) },
      },
      include: { images: true, masterProperty: true },
    }),
    // 50% listing fee split credited to agent wallet
    prisma.agentProfile.update({
      where: { id: agentProfileId },
      data: { walletBalance: { increment: agentSplit } },
    }),
    prisma.commissionLedgerEntry.create({
      data: {
        agentId: agentProfileId,
        type: listingPlan === "GOLD" ? "GOLD_SPLIT" : "UNLOCK_SPLIT",
        amount: agentSplit,
        note: `50% split for new ${listingPlan} listing "${title}"`,
      },
    }),
  ]);

  return listing;
}

export async function getListingsForAgent(agentProfileId: string) {
  return prisma.agentListing.findMany({
    where: { agentId: agentProfileId },
    include: { images: true, masterProperty: true, _count: { select: { unlocks: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export type PublicListingFilters = {
  city?: string;
  listingType?: "SALE" | "RENT";
  customerUserId?: string;
  referringAgentCode?: string;
  latitude?: number;
  longitude?: number;
};

// Client Rule:
// 1. Jis agent ne property upload ki wo uske customer ko pehle show hogi (Tier 1: Direct Agent)
// 2. Us agent ke dwara naye agent ne jo property upload ki hai uske baad aage aage wo show hogi (Tier 2: Downline Network)
// 3. Uske baad 1-5 km radius wali property show hogi (Tier 3: Local Radius & Global Feed)
// 4. Non-renewal deprioritized agents sorted last.
export async function getPublicListings(filters?: PublicListingFilters) {
  let directAgentProfileId: string | null = null;
  const downlineAgentIds = new Set<string>();

  // Determine referring agent if customer or code is provided
  if (filters?.customerUserId) {
    const customer = await prisma.user.findUnique({
      where: { id: filters.customerUserId },
      select: { referredByAgentId: true },
    });
    if (customer?.referredByAgentId) {
      directAgentProfileId = customer.referredByAgentId;
    }
  }

  if (!directAgentProfileId && filters?.referringAgentCode) {
    const refAgent = await prisma.agentProfile.findUnique({
      where: { agentCode: filters.referringAgentCode.trim().toUpperCase() },
      select: { id: true },
    });
    if (refAgent) {
      directAgentProfileId = refAgent.id;
    }
  }

  if (directAgentProfileId) {
    // Fetch downline agents (agents referred by this direct agent)
    const downline = await prisma.agentProfile.findMany({
      where: { referringAgentId: directAgentProfileId },
      select: { id: true },
    });
    for (const d of downline) {
      downlineAgentIds.add(d.id);
    }
  }

  const listings = await prisma.agentListing.findMany({
    where: {
      approvalStatus: "APPROVED",
      isDelisted: false,
      ...(filters?.city ? { masterProperty: { city: filters.city } } : {}),
      ...(filters?.listingType ? { listingType: filters.listingType } : {}),
    },
    include: { images: true, masterProperty: true, agent: true },
    orderBy: [
      { agent: { visibilityDeprioritized: "asc" } },
      { agreementExpiryDate: "asc" },
      { agent: { primeStatus: "desc" } },
      { createdAt: "desc" },
    ],
  });

  // If no direct agent attribution, return listings in standard order
  if (!directAgentProfileId) {
    return listings;
  }

  // Tiered sorting:
  // Tier 1 (rank 0): Direct Agent's properties
  // Tier 2 (rank 1): Downline Agent's properties
  // Tier 3 (rank 2): Other active properties
  // Tier 4 (rank 3): Deprioritized properties
  return listings.sort((a, b) => {
    const getRank = (item: (typeof listings)[0]) => {
      if (item.agent?.visibilityDeprioritized) return 3;
      if (item.agentId === directAgentProfileId) return 0;
      if (item.agentId && downlineAgentIds.has(item.agentId)) return 1;
      return 2;
    };

    const rankA = getRank(a);
    const rankB = getRank(b);

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    // Secondary sort: agreementExpiryDate ASC
    const dateA = a.agreementExpiryDate ? a.agreementExpiryDate.getTime() : Infinity;
    const dateB = b.agreementExpiryDate ? b.agreementExpiryDate.getTime() : Infinity;
    return dateA - dateB;
  });
}

export async function getListingBySlug(slug: string) {
  return prisma.agentListing.findUnique({
    where: { slug },
    include: { images: true, masterProperty: true, agent: { include: { user: true } } },
  });
}
