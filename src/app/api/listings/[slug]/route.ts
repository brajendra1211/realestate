import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getListingBySlug } from "@/lib/listing";
import { getUnlockForBuyer } from "@/lib/unlock";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const listing = await getListingBySlug(slug);
  if (!listing) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }

  const session = await auth();
  const isUnlocked =
    session?.user.role === "BUYER" ? Boolean(await getUnlockForBuyer(session.user.id, listing.id)) : false;

  const teaser = {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    description: listing.description,
    listingType: listing.listingType,
    propertyType: listing.propertyType,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    areaSqft: listing.areaSqft,
    price: listing.price,
    amenities: listing.amenities,
    images: listing.images,
    masterPropertyId: listing.masterProperty.masterId,
    city: listing.masterProperty.city,
    locality: listing.masterProperty.locality,
    unlocked: false,
  };

  if (!isUnlocked) {
    return NextResponse.json(teaser);
  }

  return NextResponse.json({
    ...teaser,
    unlocked: true,
    exactAddress: listing.exactAddress,
    agentCode: listing.agent.agentCode,
    agentName: listing.agent.user.name,
    agentPhone: listing.agent.user.phone,
    shopName: listing.agent.shopName,
    shopLatitude: listing.agent.shopLatitude,
    shopLongitude: listing.agent.shopLongitude,
  });
}
