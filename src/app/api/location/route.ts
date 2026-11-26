import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { indexAgentLocation } from "@/lib/agentGeo";

// Every signed-in person except the admin team sends their live GPS here (web and app) while they are online.
// Partners are buzzed by this position, not by the shop address typed at registration.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role === "ADMIN" || session.user.role === "SUBADMIN") return NextResponse.json({ ok: true, skipped: true });

  const body = (await request.json().catch(() => null)) as { latitude?: unknown; longitude?: unknown } | null;
  const latitude = Number(body?.latitude);
  const longitude = Number(body?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return NextResponse.json({ error: "Invalid location." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { liveLatitude: latitude, liveLongitude: longitude, liveLocationAt: new Date() },
  });

  if (session.user.role === "AGENT") {
    const agent = await prisma.agentProfile.findUnique({ where: { userId: session.user.id }, select: { id: true, primeStatus: true } });
    if (agent?.primeStatus) await indexAgentLocation(agent.id, latitude, longitude).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
