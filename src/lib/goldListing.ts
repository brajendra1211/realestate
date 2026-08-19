import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";
import { slugify } from "@/lib/slug";
import { getOrCreateMasterProperty } from "@/lib/masterProperty";
import { findNearbyAgents } from "@/lib/agentGeo";
import { emitToAgent } from "@/lib/socket";
import { createRazorpayOrder, isRazorpayConfigured, verifyRazorpayPaymentSignature } from "@/lib/razorpay";
import { getNearbyAmenities, formatAmenitiesNote } from "@/lib/amenityLookup";
import { computeSplit } from "@/lib/commission";
import { getSiteSettings } from "@/lib/site-settings";
import type { ListingType, PropertyType } from "@/generated/prisma";

export class GoldListingServiceError extends Error {}

const AUTO_INJECT_RADIUS_KM = 5; // "1-5 km" — §3.4
const AUTO_INJECT_MAX_AGENTS = 50; // one-shot push, not a batched cascade

async function uniqueGoldListingSlug(title: string) {
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

export type CreateGoldListingInput = {
  buyerId: string;
  referredByAgentCode?: string | null;
  title: string;
  description: string;
  listingType: ListingType;
  propertyType: PropertyType;
  bedrooms?: number | null;
  bathrooms?: number | null;
  areaSqft?: number | null;
  price: number;
  city: string;
  locality?: string | null;
  latitude: number;
  longitude: number;
  exactAddress: string;
  amenities?: string | null;
  videoUrl?: string | null;
  images: string[];
};

function validate(input: CreateGoldListingInput) {
  if (!input.title.trim() || !input.description.trim() || !input.exactAddress.trim()) {
    throw new GoldListingServiceError("validation");
  }
  if (!Number.isFinite(input.price) || input.price <= 0) {
    throw new GoldListingServiceError("validation");
  }
  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) {
    throw new GoldListingServiceError("noLocation");
  }
}

// Same real-payment seam as unlock.ts/dispatch.ts: creates a Razorpay order
// when configured, or signals the caller to fall back to the simulated
// instant flow. Validated up front so a bad submission fails before payment,
// not after.
export async function createGoldListingOrder(input: CreateGoldListingInput) {
  validate(input);
  if (!isRazorpayConfigured()) return { order: null, keyId: null };

  const settings = await getSiteSettings();
  const order = await createRazorpayOrder(settings.goldListingAmount, `gold_${input.buyerId}_${Date.now()}`);
  return { order, keyId: order ? process.env.RAZORPAY_KEY_ID ?? null : null };
}

export async function startGoldListingSimulated(input: CreateGoldListingInput) {
  validate(input);
  return createGoldListingRecord(input, null);
}

export async function verifyAndCreateGoldListing(
  input: CreateGoldListingInput,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
) {
  validate(input);
  const valid = verifyRazorpayPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!valid) throw new GoldListingServiceError("invalidSignature");
  return createGoldListingRecord(input, razorpayOrderId);
}

// "Customer self-uploads... goes to company moderation queue... system
// auto-assigns a Master Property ID... revenue split on the ₹500: 50%
// instant credit to the referring agent's wallet" — §3.4. The referral
// commission is credited immediately on payment, independent of the
// listing's moderation outcome (moderation only gates whether it goes
// public/gets auto-injected, not whether the referral was earned).
async function createGoldListingRecord(input: CreateGoldListingInput, razorpayOrderId: string | null) {
  let referringAgentId: string | null = null;
  const referredByAgentCode = input.referredByAgentCode?.trim();
  if (referredByAgentCode) {
    const referrer = await prisma.agentProfile.findUnique({ where: { agentCode: referredByAgentCode } });
    if (referrer) referringAgentId = referrer.id;
  }

  const masterProperty = await getOrCreateMasterProperty({
    city: input.city,
    locality: input.locality,
    latitude: input.latitude,
    longitude: input.longitude,
  });

  const nearby = await getNearbyAmenities(input.latitude, input.longitude);

  const listing = await prisma.agentListing.create({
    data: {
      masterPropertyId: masterProperty.id,
      agentId: referringAgentId,
      source: "CUSTOMER_GOLD",
      approvalStatus: "PENDING",
      slug: await uniqueGoldListingSlug(input.title),
      title: input.title.trim(),
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
      videoUrl: input.videoUrl?.trim() || null,
      images: { create: input.images.map((url, order) => ({ url, order })) },
    },
    include: { images: true, masterProperty: true },
  });

  const settings = await getSiteSettings();
  const { agentSplit: splitAgentShare, companySplit: splitCompanyShare } = computeSplit(
    settings.goldListingAmount,
    settings.goldAgentSplitPercent
  );
  const agentSplit = referringAgentId ? splitAgentShare : 0;
  const companySplit = referringAgentId ? splitCompanyShare : settings.goldListingAmount;

  await prisma.goldListingPurchase.create({
    data: {
      agentListingId: listing.id,
      buyerId: input.buyerId,
      amount: settings.goldListingAmount,
      agentSplit,
      companySplit,
      razorpayOrderId,
    },
  });

  if (referringAgentId) {
    const agent = await prisma.agentProfile.findUniqueOrThrow({
      where: { id: referringAgentId },
      include: { user: { select: { phone: true, email: true } } },
    });

    await prisma.$transaction([
      prisma.commissionLedgerEntry.create({
        data: {
          agentId: referringAgentId,
          type: "GOLD_SPLIT",
          amount: agentSplit,
          refId: listing.id,
          note: `${settings.goldAgentSplitPercent}% of ₹${settings.goldListingAmount} Gold Membership self-listing "${listing.title}"`,
        },
      }),
      prisma.agentProfile.update({
        where: { id: referringAgentId },
        data: { walletBalance: { increment: agentSplit } },
      }),
    ]);

    await notifyUser(
      agent.user,
      `A customer used your Agent Code to self-list a property (Gold Membership). ₹${agentSplit} has been credited to your wallet.`,
      "Gold listing referral credited"
    );
  }

  return listing;
}

// "Goes to company moderation queue (anti-fake-listing check) before going
// live" — §3.4.
export async function approveGoldListing(agentListingId: string) {
  const listing = await prisma.agentListing.update({
    where: { id: agentListingId },
    data: { approvalStatus: "APPROVED" },
    include: { masterProperty: true },
  });

  await injectToNearbyAgents(listing.id, listing.masterProperty.latitude, listing.masterProperty.longitude);
  return listing;
}

export async function rejectGoldListing(agentListingId: string) {
  return prisma.agentListing.update({
    where: { id: agentListingId },
    data: { approvalStatus: "REJECTED" },
  });
}

// "Auto-injected into every active Prime Agent's CRM within a 1-5 km
// radius — agents do zero manual searching." A live push (Socket.io), not a
// persisted per-agent notification row — the agent-side feed
// (getGoldListingsForAgent below) is a live radius query, same reasoning as
// Phase 4's broadcasts: this is a one-shot push, not a stateful cascade.
async function injectToNearbyAgents(agentListingId: string, latitude: number, longitude: number) {
  const nearby = await findNearbyAgents(latitude, longitude, AUTO_INJECT_RADIUS_KM, AUTO_INJECT_MAX_AGENTS);
  for (const agent of nearby) {
    emitToAgent(agent.agentProfileId, "listing:new-gold", { agentListingId });
  }
}

export async function getGoldListingsForModeration() {
  return prisma.agentListing.findMany({
    where: { source: "CUSTOMER_GOLD", approvalStatus: "PENDING" },
    include: { images: true, masterProperty: true, goldPurchase: true },
    orderBy: { createdAt: "asc" },
  });
}

// "Direct Customer Listing" feed — every APPROVED Gold listing within
// radius of this agent's own shop. Any Prime agent (not just the referring
// one) sees it and "can still visit and upload their own better-quality
// photos on top of the same Master ID" — §3.4.
export async function getGoldListingsForAgent(agentProfileId: string) {
  const agent = await prisma.agentProfile.findUnique({ where: { id: agentProfileId } });
  if (!agent?.shopLatitude || !agent?.shopLongitude) return [];

  const { haversineDistanceKm } = await import("@/lib/geo");
  const listings = await prisma.agentListing.findMany({
    where: { source: "CUSTOMER_GOLD", approvalStatus: "APPROVED" },
    include: { images: true, masterProperty: true },
    orderBy: { createdAt: "desc" },
  });

  return listings
    .map((listing) => ({
      ...listing,
      distanceKm: haversineDistanceKm(
        { latitude: agent.shopLatitude!, longitude: agent.shopLongitude! },
        { latitude: listing.masterProperty.latitude, longitude: listing.masterProperty.longitude }
      ),
    }))
    .filter((listing) => listing.distanceKm <= AUTO_INJECT_RADIUS_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
