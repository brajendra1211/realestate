import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rejectAgentPayout, PayoutServiceError } from "@/lib/payout";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const payout = await rejectAgentPayout(id);
    return NextResponse.json(payout);
  } catch (error) {
    if (error instanceof PayoutServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
