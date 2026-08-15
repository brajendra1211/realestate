import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { distributeInvestorDealProfit, InvestorServiceError } from "@/lib/investor";
import type { PaymentMode } from "@/generated/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const distribution = await distributeInvestorDealProfit({
      investorProfileId: String(body.investorProfileId ?? ""),
      totalProfit: Number(body.totalProfit),
      paymentMode: (body.paymentMode as PaymentMode) ?? "BANK_TRANSFER",
      note: body.note ? String(body.note) : null,
      customerTransactionRef: body.customerTransactionRef ? String(body.customerTransactionRef) : null,
    });
    return NextResponse.json(distribution, { status: 201 });
  } catch (error) {
    if (error instanceof InvestorServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Distributing investor profit failed", error);
    return NextResponse.json({ error: "Failed to distribute profit" }, { status: 500 });
  }
}
