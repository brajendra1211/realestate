import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { cancelDispatch, DispatchServiceError } from "@/lib/dispatch";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    await cancelDispatch(id, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof DispatchServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
