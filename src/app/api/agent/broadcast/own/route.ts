import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { getOwnBroadcasts } from "@/lib/broadcast";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) return NextResponse.json({ error: "notFound" }, { status: 404 });

  const broadcasts = await getOwnBroadcasts(agent.id);
  return NextResponse.json(broadcasts);
}
