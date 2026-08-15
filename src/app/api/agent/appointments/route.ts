import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { createAppointment, getAppointmentsForAgent, AppointmentServiceError } from "@/lib/appointment";
import { prisma } from "@/lib/prisma";

async function requireAgent() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") return null;
  return getAgentByUserId(session.user.id);
}

export async function GET() {
  const agent = await requireAgent();
  if (!agent) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appointments = await getAppointmentsForAgent(agent.id);
  return NextResponse.json(appointments);
}

export async function POST(request: Request) {
  const agent = await requireAgent();
  if (!agent) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const masterProperty = body.masterId
    ? await prisma.masterProperty.findUnique({ where: { masterId: String(body.masterId) } })
    : null;

  try {
    const appointment = await createAppointment({
      buyerId: String(body.buyerId ?? ""),
      agentId: agent.id,
      masterPropertyId: masterProperty?.id ?? null,
      scheduledAt: new Date(String(body.scheduledAt ?? "")),
    });
    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    if (error instanceof AppointmentServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
