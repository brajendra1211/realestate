import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { approveAgent } from "@/lib/agent";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const agent = await approveAgent(id);
  return NextResponse.json(agent);
}
