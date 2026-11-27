import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getLiveMapData } from "@/lib/liveMap";

// Polled client-side every ~20s by the live-map page (src/components/admin/LiveMapClient.tsx)
// instead of the usual LiveRefresh signal — agent location pings deliberately
// don't bump that (see src/app/api/agent/location/route.ts), so this page
// needs its own light poll for fresh marker positions.
export async function GET() {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUBADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await getLiveMapData();
  return NextResponse.json(data);
}
