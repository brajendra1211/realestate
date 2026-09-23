import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateInvestorCapital, InvestorServiceError } from "@/lib/investor";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const investor = await updateInvestorCapital(id, Number(body.totalInvested));
    return NextResponse.json(investor);
  } catch (error) {
    if (error instanceof InvestorServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
