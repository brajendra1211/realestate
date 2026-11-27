import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAgentByUserId } from "@/lib/agent";
import { indexAgentLocation } from "@/lib/agentGeo";

// Agent app pings this every couple of minutes while open (src/core/location
// in the Flutter app). Uses $executeRaw instead of prisma.agentProfile.update
// so this high-frequency write never bumps liveVersion's AgentProfile
// counter — that would refresh every open admin tab on every ping.
export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const agent = await getAgentByUserId(session.user.id);
  if (!agent) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { latitude?: unknown; longitude?: unknown };
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  await prisma.$executeRaw`UPDATE AgentProfile SET lastLatitude = ${latitude}, lastLongitude = ${longitude}, lastLocationAt = NOW() WHERE id = ${agent.id}`;
  await indexAgentLocation(agent.id, latitude, longitude).catch(() => {});

  return NextResponse.json({ ok: true });
}
