import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAgentShopUnlockOrder, AgentShopUnlockError } from "@/lib/agentShopUnlock";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ agentCode: string }> }
) {
  const { agentCode } = await context.params;
  const session = await auth();
  const buyerId = session?.user?.id;

  let body: { customerPhone?: string } = {};
  try {
    body = await request.json();
  } catch {
    // optional body
  }

  try {
    const result = await createAgentShopUnlockOrder(
      agentCode,
      buyerId,
      body.customerPhone
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AgentShopUnlockError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Agent shop order creation error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
