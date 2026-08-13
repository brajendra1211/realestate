import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rejectAgent } from "@/lib/agent";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const reason = String(body.reason ?? "");
  if (!reason.trim()) {
    return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });
  }

  const agent = await rejectAgent(id, reason);
  return NextResponse.json(agent);
}
