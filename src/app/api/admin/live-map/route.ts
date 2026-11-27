import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getLiveMapData } from "@/lib/liveMap";

// Polled client-side every ~20s by the live-map page (src/components/admin/LiveMapClient.tsx)
// instead of the usual LiveRefresh signal — every person's location ping
// (src/app/api/location/route.ts) bumps User's live-refresh counter, which
// would otherwise reload this whole page on every single ping platform-wide.
export async function GET() {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUBADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await getLiveMapData();
  return NextResponse.json(data);
}
