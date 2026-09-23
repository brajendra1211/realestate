import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { verifyDirectVisitOtp, DirectVisitError } from "@/lib/directVisit";

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  if (!body.visitId || !body.otp) {
    return NextResponse.json({ error: "visitId and otp are required" }, { status: 400 });
  }

  try {
    const result = await verifyDirectVisitOtp(String(body.visitId), String(body.otp));
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DirectVisitError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to verify direct visit OTP", error);
    return NextResponse.json({ error: "Failed to verify OTP" }, { status: 500 });
  }
}
