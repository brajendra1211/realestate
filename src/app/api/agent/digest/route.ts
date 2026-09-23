import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { getNewListingsDigest } from "@/lib/digest";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) return NextResponse.json({ error: "notFound" }, { status: 404 });

  const digest = await getNewListingsDigest(agent.id);
  return NextResponse.json(digest);
}
