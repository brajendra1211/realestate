import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { markCompleted, cancelAppointment } from "@/lib/appointment";

// Body: { action: "complete" | "cancel" }
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));

  const appointment =
    body.action === "cancel" ? await cancelAppointment(id) : await markCompleted(id);
  return NextResponse.json(appointment);
}
