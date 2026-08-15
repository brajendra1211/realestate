import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { getChatThread, sendAgentChatMessage, BroadcastServiceError } from "@/lib/broadcast";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; agentId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) return NextResponse.json({ error: "notFound" }, { status: 404 });

  const { id, agentId } = await context.params;
  const messages = await getChatThread(id, agent.id, agentId);
  return NextResponse.json(messages);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; agentId: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) return NextResponse.json({ error: "notFound" }, { status: 404 });

  const { id, agentId } = await context.params;
  const body = await request.json().catch(() => ({}));

  try {
    const message = await sendAgentChatMessage(id, agent.id, agentId, String(body.message ?? ""));
    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    if (error instanceof BroadcastServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
