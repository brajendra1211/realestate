import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { getSocietiesNearAgent } from "@/lib/broadcast";

export async function GET(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) return NextResponse.json({ error: "notFound" }, { status: 404 });

  const url = new URL(request.url);
  const radiusKm = Number(url.searchParams.get("radiusKm") ?? 1);

  const societies = await getSocietiesNearAgent(agent.id, radiusKm);
  return NextResponse.json(societies);
}
