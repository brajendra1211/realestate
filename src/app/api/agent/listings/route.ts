import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import {
  createAgentListing,
  getListingsForAgent,
  ListingServiceError,
  type CreateAgentListingInput,
} from "@/lib/listing";

async function requireAgent() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") return null;
  return getAgentByUserId(session.user.id);
}

export async function GET() {
  const agent = await requireAgent();
  if (!agent) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const listings = await getListingsForAgent(agent.id);
  return NextResponse.json(listings);
}

export async function POST(request: Request) {
  const agent = await requireAgent();
  if (!agent) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (agent.status !== "APPROVED" || !agent.primeStatus) {
    return NextResponse.json({ error: "notPrime" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const listing = await createAgentListing(agent.id, {
      masterPropertyId: body.masterPropertyId || null,
      city: String(body.city ?? ""),
      locality: body.locality ? String(body.locality) : null,
      latitude: Number(body.latitude),
      longitude: Number(body.longitude),
      title: String(body.title ?? ""),
      description: String(body.description ?? ""),
      listingType: body.listingType as CreateAgentListingInput["listingType"],
      propertyType: body.propertyType as CreateAgentListingInput["propertyType"],
      bedrooms: body.bedrooms != null ? Number(body.bedrooms) : null,
      bathrooms: body.bathrooms != null ? Number(body.bathrooms) : null,
      areaSqft: body.areaSqft != null ? Number(body.areaSqft) : null,
      price: Number(body.price ?? 0),
      exactAddress: String(body.exactAddress ?? ""),
      amenities: body.amenities ? String(body.amenities) : null,
      images: Array.isArray(body.images) ? body.images.map(String) : [],
    });
    return NextResponse.json(listing, { status: 201 });
  } catch (error) {
    if (error instanceof ListingServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Agent listing creation failed", error);
    return NextResponse.json({ error: "Creation failed" }, { status: 500 });
  }
}
