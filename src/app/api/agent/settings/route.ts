import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAgentByUserId } from "@/lib/agent";

// Agent app -> Settings: two notification switches.
async function currentAgent() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") return null;
  return getAgentByUserId(session.user.id);
}

export async function GET() {
  const agent = await currentAgent();
  if (!agent) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const s = await prisma.agentProfile.findUniqueOrThrow({
    where: { id: agent.id },
    select: { buzzerAlerts: true, listingAlerts: true },
  });
  return NextResponse.json(s);
}

export async function PATCH(request: Request) {
  const agent = await currentAgent();
  if (!agent) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { buzzerAlerts?: unknown; listingAlerts?: unknown };
  const data: { buzzerAlerts?: boolean; listingAlerts?: boolean } = {};
  if (typeof body.buzzerAlerts === "boolean") data.buzzerAlerts = body.buzzerAlerts;
  if (typeof body.listingAlerts === "boolean") data.listingAlerts = body.listingAlerts;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const s = await prisma.agentProfile.update({
    where: { id: agent.id },
    data,
    select: { buzzerAlerts: true, listingAlerts: true },
  });
  return NextResponse.json(s);
}
