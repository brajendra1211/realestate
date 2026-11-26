import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { visibleToAgentWhere, parseOwnerDetails } from "@/lib/listingRequest";
import { haversineDistanceKm } from "@/lib/geo";
import { agentPoint } from "@/lib/agentGeo";
import { visibleInterestsForAgent } from "@/lib/buyerInterest";

// Polled by the buzzer in the partner panel: requests that were alerted to this
// partner and are still waiting for someone to accept. No owner contact is
// revealed here — only the accepting partner gets that.
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const agent = await prisma.agentProfile.findUnique({ where: { userId: session.user.id }, select: { id: true, status: true, primeStatus: true, shopLatitude: true, shopLongitude: true, user: { select: { liveLatitude: true, liveLongitude: true, liveLocationAt: true } } } });
  if (!agent || agent.status !== "APPROVED" || !agent.primeStatus) return NextResponse.json({ pending: [], interests: [] });

  const rows = await prisma.listingRequest.findMany({
    where: visibleToAgentWhere(agent.id),
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, city: true, locality: true, plan: true, createdAt: true, buzzCount: true, latitude: true, longitude: true, detailsJson: true, buzzRadiusKm: true },
  });
  const here = agentPoint(agent);
  const pending = rows.map((r) => {
    const d = parseOwnerDetails(r);
    const distanceKm =
      r.latitude != null && r.longitude != null && here
        ? Math.round(haversineDistanceKm(here, { latitude: r.latitude, longitude: r.longitude }) * 10) / 10
        : null;
    return {
      id: r.id, city: r.city, locality: r.locality, plan: r.plan, createdAt: r.createdAt, buzzCount: r.buzzCount,
      distanceKm,
      mapUrl: r.latitude != null && r.longitude != null ? `https://www.google.com/maps?q=${r.latitude},${r.longitude}` : null,
      property: d ? { title: d.title, type: d.propertyType, bedrooms: d.bedrooms ?? null, areaSqft: d.areaSqft ?? null, rent: d.price, photo: d.images[0] ?? null, photos: d.images.length } : null,
    };
  });
  const interests = await visibleInterestsForAgent(agent.id);
  return NextResponse.json({ pending, interests });
}
