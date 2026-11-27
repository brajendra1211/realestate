import { NextResponse } from "next/server";
import { verifyRequestPaymentAction } from "@/app/list-property/request/actions";

export async function POST(request: Request) {
  const b = (await request.json().catch(() => ({}))) as Record<string, string>;
  try {
    const r = await verifyRequestPaymentAction(b.requestId, b.statusToken, b.orderId, b.paymentId, b.signature);
    return NextResponse.json(r);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Payment verification failed." }, { status: 400 });
  }
}
