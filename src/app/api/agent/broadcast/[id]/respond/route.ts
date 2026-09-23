import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { respondToBroadcast, BroadcastServiceError } from "@/lib/broadcast";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) return NextResponse.json({ error: "notFound" }, { status: 404 });

  const { id } = await context.params;

  try {
    const response = await respondToBroadcast(id, agent.id);
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof BroadcastServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
