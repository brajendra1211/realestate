import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { verifyAndUnlockAgentShop, AgentShopUnlockError } from "@/lib/agentShopUnlock";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ agentCode: string }> }
) {
  const { agentCode } = await context.params;
  const session = await auth();
  const buyerId = session?.user?.id;

  let body: {
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    customerPhone?: string;
  } = {};

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const unlock = await verifyAndUnlockAgentShop({
      agentCode,
      razorpayOrderId: body.razorpayOrderId,
      razorpayPaymentId: body.razorpayPaymentId,
      razorpaySignature: body.razorpaySignature,
      buyerId,
      customerPhone: body.customerPhone,
    });

    return NextResponse.json({
      success: true,
      message: "Agent shop unlocked successfully",
      unlockId: unlock.id,
    });
  } catch (error) {
    if (error instanceof AgentShopUnlockError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Agent shop unlock verification error:", error);
    return NextResponse.json({ error: "Failed to verify unlock" }, { status: 500 });
  }
}
