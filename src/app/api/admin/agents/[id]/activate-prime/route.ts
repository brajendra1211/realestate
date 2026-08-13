import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { activateAgentPrime, AgentServiceError } from "@/lib/agent";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const planId = String(body.planId ?? "");
  if (!planId) {
    return NextResponse.json({ error: "planId is required" }, { status: 400 });
  }

  try {
    const agent = await activateAgentPrime(id, planId);
    return NextResponse.json(agent);
  } catch (error) {
    if (error instanceof AgentServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
