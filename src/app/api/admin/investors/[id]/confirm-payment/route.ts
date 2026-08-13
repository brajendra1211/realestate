import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { confirmInvestorPayment, InvestorServiceError } from "@/lib/investor";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const investor = await confirmInvestorPayment(id);
    return NextResponse.json(investor);
  } catch (error) {
    if (error instanceof InvestorServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
