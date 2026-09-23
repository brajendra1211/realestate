import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getInvestorByUserId, getInvestorLedger } from "@/lib/investor";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "INVESTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const investor = await getInvestorByUserId(session.user.id);
  if (!investor) return NextResponse.json({ error: "notFound" }, { status: 404 });

  const ledger = await getInvestorLedger(investor.id);
  return NextResponse.json(ledger);
}
