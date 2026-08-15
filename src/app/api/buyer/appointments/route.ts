import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAppointmentsForBuyer } from "@/lib/appointment";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appointments = await getAppointmentsForBuyer(session.user.id);
  return NextResponse.json(appointments);
}
