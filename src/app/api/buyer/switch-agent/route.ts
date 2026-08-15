import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { switchAgent, canSwitchAgent, AgentSwitchServiceError } from "@/lib/agentSwitch";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { phone: true } });
  if (!user?.phone) return NextResponse.json({ error: "noPhone" }, { status: 400 });

  const gate = await canSwitchAgent(user.phone);
  return NextResponse.json(gate);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.phone) return NextResponse.json({ error: "noPhone" }, { status: 400 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const result = await switchAgent({
      customerPhone: user.phone,
      fromAgentId: String(body.fromAgentId ?? ""),
      reason: String(body.reason ?? ""),
      isComplaint: Boolean(body.isComplaint),
      latitude: Number(body.latitude ?? 0),
      longitude: Number(body.longitude ?? 0),
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof AgentSwitchServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
