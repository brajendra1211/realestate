import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { setAgentAutoPayMandate } from "@/lib/agentPlans";

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agent = await prisma.agentProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!agent) {
    return NextResponse.json({ error: "Channel Partner profile not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const vpa = String(body.vpa ?? "").trim();
  if (!vpa || !vpa.includes("@")) {
    return NextResponse.json({ error: "Please provide a valid UPI ID (e.g. name@upi)" }, { status: 400 });
  }

  try {
    const updated = await setAgentAutoPayMandate(agent.id, vpa);
    return NextResponse.json({
      success: true,
      autoPayActive: updated.autoPayActive,
      autoPayMandate: updated.autoPayMandate,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update mandate" }, { status: 400 });
  }
}
