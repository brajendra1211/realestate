import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSocietiesNearPoint } from "@/lib/broadcast";

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const latitude = Number(url.searchParams.get("lat"));
  const longitude = Number(url.searchParams.get("lng"));
  const radiusKm = [1, 3, 5].includes(Number(url.searchParams.get("radiusKm"))) ? Number(url.searchParams.get("radiusKm")) : 5;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return NextResponse.json([]);
  return NextResponse.json(await getSocietiesNearPoint(latitude, longitude, radiusKm));
}
