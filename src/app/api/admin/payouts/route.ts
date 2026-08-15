import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPendingPayouts } from "@/lib/payout";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payouts = await getPendingPayouts();
  return NextResponse.json(payouts);
}
