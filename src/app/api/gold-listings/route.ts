import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { geocodeLocation } from "@/lib/geocode";
import {
  createGoldListingOrder,
  startGoldListingSimulated,
  GoldListingServiceError,
  type CreateGoldListingInput,
} from "@/lib/goldListing";
import { isRazorpayConfigured } from "@/lib/razorpay";

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const coords = await geocodeLocation(`${body.address ?? ""}, ${body.city ?? ""}`);
  if (!coords) return NextResponse.json({ error: "noLocation" }, { status: 400 });

  const input: CreateGoldListingInput = {
    buyerId: session.user.id,
    referredByAgentCode: body.referredByAgentCode ? String(body.referredByAgentCode) : null,
    title: String(body.title ?? ""),
    description: String(body.description ?? ""),
    listingType: body.listingType,
    propertyType: body.propertyType,
    bedrooms: body.bedrooms != null ? Number(body.bedrooms) : null,
    bathrooms: body.bathrooms != null ? Number(body.bathrooms) : null,
    areaSqft: body.areaSqft != null ? Number(body.areaSqft) : null,
    price: Number(body.price),
    city: String(body.city ?? ""),
    locality: body.locality ? String(body.locality) : null,
    latitude: coords.latitude,
    longitude: coords.longitude,
    exactAddress: String(body.address ?? ""),
    amenities: body.amenities ? String(body.amenities) : null,
    videoUrl: body.videoUrl ? String(body.videoUrl) : null,
    images: Array.isArray(body.images) ? body.images.map(String) : [],
  };

  try {
    if (!isRazorpayConfigured()) {
      const listing = await startGoldListingSimulated(input);
      return NextResponse.json({ simulated: true, slug: listing.slug }, { status: 201 });
    }

    const { order, keyId } = await createGoldListingOrder(input);
    if (!order || !keyId) {
      return NextResponse.json({ error: "paymentUnavailable" }, { status: 503 });
    }
    return NextResponse.json({ simulated: false, order, keyId, input }, { status: 201 });
  } catch (error) {
    if (error instanceof GoldListingServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Creating gold listing failed", error);
    return NextResponse.json({ error: "Failed to submit listing" }, { status: 500 });
  }
}
