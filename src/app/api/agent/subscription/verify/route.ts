import { NextResponse } from "next/server";
import { requireAgentApi, fail } from "@/lib/agentApi";
import { confirmPlanPayment } from "@/lib/agentRegistrationPayment";

export async function POST(request: Request) {
  const g = await requireAgentApi();
  if ("error" in g) return g.error;
  const b = (await request.json().catch(() => ({}))) as {
    planId?: string;
    mode?: "register" | "upgrade";
    orderId?: string;
    paymentId?: string;
    signature?: string;
  };
  if (!b.planId) return fail(null, "Missing plan");
  try {
    await confirmPlanPayment(g.agent.id, b.planId, b.mode === "upgrade" ? "upgrade" : "register", {
      razorpayOrderId: b.orderId,
      razorpayPaymentId: b.paymentId,
      razorpaySignature: b.signature,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
