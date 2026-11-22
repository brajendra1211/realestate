import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { advanceListingRequests, REQUEST_STATUS_LABEL } from "@/lib/listingRequest";

// The signed-in owner's listing requests, for the app's "My property" screen.
export async function GET() {
  const session = await auth();
  if (!session || (session.user.role !== "OWNER" && session.user.role !== "DEALER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await advanceListingRequests().catch(() => 0);
  const rows = await prisma.listingRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { agentListing: { select: { slug: true, title: true } }, acceptedAgent: { select: { user: { select: { name: true, phone: true } } } } },
  });
  return NextResponse.json({
    requests: rows.map((r) => ({
      id: r.id,
      status: r.status,
      statusLabel: REQUEST_STATUS_LABEL[r.status],
      purpose: r.purpose,
      plan: r.plan,
      amount: r.amount,
      city: r.city,
      locality: r.locality,
      formToken: r.formToken,
      statusToken: r.statusToken,
      buzzRadiusKm: r.buzzRadiusKm,
      detailsAt: r.detailsAt?.toISOString() ?? null,
      acceptedAt: r.acceptedAt?.toISOString() ?? null,
      paidAt: r.paidAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      partnerName: r.acceptedAgent?.user.name ?? null,
      listingSlug: r.agentListing?.slug ?? null,
      listingTitle: r.agentListing?.title ?? null,
    })),
  });
}
