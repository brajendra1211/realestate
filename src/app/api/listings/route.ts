import { NextResponse } from "next/server";
import { getPublicListings } from "@/lib/listing";
import { getWebsiteListings } from "@/lib/websiteListings";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const city = url.searchParams.get("city") ?? undefined;
  const listingTypeParam = url.searchParams.get("listingType");
  const listingType = listingTypeParam === "SALE" || listingTypeParam === "RENT" ? listingTypeParam : undefined;

  const [agentListings, websiteListings] = await Promise.all([
    getPublicListings({ city, listingType }),
    getWebsiteListings({ city, listingType }),
  ]);
  return NextResponse.json([...agentListings, ...websiteListings]);
}
