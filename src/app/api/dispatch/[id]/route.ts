import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDispatchStatus } from "@/lib/dispatch";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const dispatch = await getDispatchStatus(id);
  if (!dispatch || dispatch.buyerId !== session.user.id) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }

  return NextResponse.json(dispatch);
}
