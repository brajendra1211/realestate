import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAgentApi } from "@/lib/agentApi";
import { parseOwnerDetails, advanceListingRequests } from "@/lib/listingRequest";

// Requests this partner accepted: owner contact, the property details to check, and whether it is verified.
export async function GET() {
  const g = await requireAgentApi();
  if ("error" in g) return g.error;
  await advanceListingRequests().catch(() => 0);
  const rows = await prisma.listingRequest.findMany({
    where: { acceptedByAgentId: g.agent.id, status: { in: ["ACCEPTED", "LINK_SENT", "SUBMITTED"] } },
    orderBy: { acceptedAt: "desc" },
    take: 50,
    include: { agentListing: { select: { slug: true } } },
  });
  return NextResponse.json({
    requests: rows.map((r) => {
      const d = parseOwnerDetails(r);
      return {
        id: r.id,
        status: r.status,
        ownerName: r.ownerName,
        ownerPhone: r.ownerPhone,
        city: r.city,
        locality: r.locality,
        plan: r.plan,
        agentSplit: r.agentSplit,
        latitude: r.latitude,
        longitude: r.longitude,
        acceptedAt: r.acceptedAt?.toISOString() ?? null,
        listingSlug: r.agentListing?.slug ?? null,
        details: d
          ? {
              title: d.title,
              propertyType: d.propertyType,
              bedrooms: d.bedrooms ?? null,
              bathrooms: d.bathrooms ?? null,
              areaSqft: d.areaSqft ?? null,
              price: d.price,
              securityDeposit: d.securityDeposit ?? null,
              exactAddress: d.exactAddress,
              description: d.description,
              images: d.images,
            }
          : null,
      };
    }),
  });
}
