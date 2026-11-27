import { NextResponse } from "next/server";
import { requireAgentApi, fail } from "@/lib/agentApi";
import { confirmBrochureRecharge } from "@/lib/brochure";

export async function POST(request: Request) {
  const g = await requireAgentApi();
  if ("error" in g) return g.error;
  const b = (await request.json().catch(() => ({}))) as { orderId?: string; paymentId?: string; signature?: string };
  try {
    await confirmBrochureRecharge(g.agent.id, { razorpayOrderId: b.orderId, razorpayPaymentId: b.paymentId, razorpaySignature: b.signature });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
