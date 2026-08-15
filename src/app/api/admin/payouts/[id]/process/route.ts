import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { processAgentPayout, PayoutServiceError } from "@/lib/payout";
import type { PaymentMode } from "@/generated/prisma";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const paymentMode = (body.paymentMode as PaymentMode | undefined) ?? "BANK_TRANSFER";

  try {
    const payout = await processAgentPayout(id, paymentMode);
    return NextResponse.json(payout);
  } catch (error) {
    if (error instanceof PayoutServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
