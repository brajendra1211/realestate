import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { geocodeLocation } from "@/lib/geocode";
import { findNearbyMasterProperties } from "@/lib/masterProperty";

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const city = String(body.city ?? "").trim();
  const locality = String(body.locality ?? "").trim();
  const address = String(body.address ?? "").trim();
  if (!city || !address) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }

  const coords = await geocodeLocation([address, locality, city].filter(Boolean).join(", "));
  if (!coords) {
    return NextResponse.json({ error: "geocode" }, { status: 400 });
  }

  const candidates = await findNearbyMasterProperties(city, coords.latitude, coords.longitude);
  return NextResponse.json({ ...coords, candidates });
}
