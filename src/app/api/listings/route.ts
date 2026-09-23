import { NextResponse } from "next/server";
import { getPublicListings } from "@/lib/listing";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const city = url.searchParams.get("city") ?? undefined;
  const listingTypeParam = url.searchParams.get("listingType");
  const listingType = listingTypeParam === "SALE" || listingTypeParam === "RENT" ? listingTypeParam : undefined;

  const listings = await getPublicListings({ city, listingType });
  return NextResponse.json(listings);
}
