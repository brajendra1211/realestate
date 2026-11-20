import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { liveTokenFor } from "@/lib/liveVersion";

// Cheap, in-memory "has anything changed?" check. The role comes from the session,
// never from the client, so a user can only ever watch their own role's data set.
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth().catch(() => null);
  if (!session) return NextResponse.json({ v: null }, { headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ v: liveTokenFor(session.user.role) }, { headers: { "Cache-Control": "no-store" } });
}
