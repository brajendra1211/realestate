import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { markNoShow, AppointmentServiceError } from "@/lib/appointment";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const result = await markNoShow(id, session.user.id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AppointmentServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
