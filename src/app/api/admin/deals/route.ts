import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { recordDeal, getDealHistory, DealServiceError } from "@/lib/deal";
import type { PaymentMode } from "@/generated/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return false;
  return true;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deals = await getDealHistory();
  return NextResponse.json(deals);
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const deal = await recordDeal({
      dealValue: Number(body.dealValue),
      buyerAgentId: body.buyerAgentId ? String(body.buyerAgentId) : null,
      sellerAgentId: body.sellerAgentId ? String(body.sellerAgentId) : null,
      paymentMode: (body.paymentMode as PaymentMode) ?? "BANK_TRANSFER",
      note: body.note ? String(body.note) : null,
    });
    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    if (error instanceof DealServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Recording deal failed", error);
    return NextResponse.json({ error: "Failed to record deal" }, { status: 500 });
  }
}
