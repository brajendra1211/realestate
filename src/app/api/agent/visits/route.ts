import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { logVisit, getVisitLogsForAgent, VisitLogServiceError } from "@/lib/visitLog";
import { prisma } from "@/lib/prisma";

async function requireAgent() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") return null;
  return getAgentByUserId(session.user.id);
}

export async function GET() {
  const agent = await requireAgent();
  if (!agent) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const visits = await getVisitLogsForAgent(agent.id);
  return NextResponse.json(visits);
}

export async function POST(request: Request) {
  const agent = await requireAgent();
  if (!agent) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const masterProperty = await prisma.masterProperty.findUnique({
    where: { masterId: String(body.masterId ?? "") },
  });
  if (!masterProperty) return NextResponse.json({ error: "propertyNotFound" }, { status: 400 });

  try {
    const result = await logVisit({
      agentId: agent.id,
      customerPhone: String(body.customerPhone ?? ""),
      customerName: body.customerName ? String(body.customerName) : null,
      masterPropertyId: masterProperty.id,
      otp: String(body.otp ?? ""),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof VisitLogServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
