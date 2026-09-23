import { prisma } from "@/lib/prisma";
import { PUBLIC_LISTER_FILTER, notExpiredFilter } from "@/lib/propertyVisibility";
import type { Prisma } from "@/generated/prisma/client";

// The website's own `Property` listings (owner/dealer posted) live in a
// different table from the agent marketplace's `AgentListing`. The mobile app
// only knows the AgentListing shape, so these helpers expose the public
// website properties in that same shape for GET /api/listings[/slug].

function publicWhere(): Prisma.PropertyWhereInput {
  return {
    approvalStatus: "APPROVED",
    status: "AVAILABLE",
    owner: PUBLIC_LISTER_FILTER,
    AND: [notExpiredFilter()],
  };
}

type WebsiteProperty = Prisma.PropertyGetPayload<{ include: { images: true; owner: true } }>;

function toImages(property: WebsiteProperty) {
  return [...property.images]
    .sort((a, b) => a.order - b.order)
    .map((image) => ({ id: image.id, url: image.url, order: image.order }));
}

export async function getWebsiteListings(filters?: { city?: string; listingType?: "SALE" | "RENT" }) {
  const where = publicWhere();
  if (filters?.city) {
    where.OR = [{ city: { contains: filters.city } }, { locality: { contains: filters.city } }];
  }
  if (filters?.listingType) where.listingType = filters.listingType;

  const properties = await prisma.property.findMany({
    where,
    include: { images: true, owner: true },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  });

  return properties.map((property) => ({
    id: property.id,
    slug: property.slug,
    title: property.title,
    description: property.description,
    listingType: property.listingType,
    propertyType: property.propertyType,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    areaSqft: property.areaSqft,
    price: property.price,
    amenities: property.amenities,
    images: toImages(property),
    masterProperty: { city: property.city, locality: property.locality },
    createdAt: property.createdAt,
    agreementExpiryDate: null,
    agent: null,
  }));
}

// The website shows a property's address and contact publicly, so the app
// gets it already unlocked.
export async function getWebsiteListingDetail(slug: string) {
  const property = await prisma.property.findFirst({
    where: { ...publicWhere(), slug },
    include: { images: true, owner: true },
  });
  if (!property) return null;

  return {
    id: property.id,
    slug: property.slug,
    title: property.title,
    description: property.description,
    listingType: property.listingType,
    propertyType: property.propertyType,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    areaSqft: property.areaSqft,
    price: property.price,
    amenities: property.amenities,
    images: toImages(property),
    city: property.city,
    locality: property.locality,
    unlocked: true,
    exactAddress: property.address ?? property.locality ?? property.city,
    agentCode: null,
    agentName: property.contactName ?? property.owner.name,
    agentPhone: property.contactPhone ?? property.owner.phone,
    shopName: null,
    shopLatitude: null,
    shopLongitude: null,
  };
}
