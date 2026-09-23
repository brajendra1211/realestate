import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFinancialAnalytics } from "@/lib/analytics";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const analytics = await getFinancialAnalytics();
  return NextResponse.json(analytics);
}
