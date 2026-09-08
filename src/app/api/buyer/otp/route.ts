import { NextResponse } from "next/server";
import { requestOtp } from "@/lib/otp";

// Public — this *is* the login step, no session exists yet. REST
// equivalent of src/app/buyer/login/actions.ts's requestBuyerOtp, for the
// Flutter app (which can't invoke a Next.js Server Action directly).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const identifier = String(body?.identifier ?? "").trim();
  if (!identifier) return NextResponse.json({ error: "validation" }, { status: 400 });

  const result = await requestOtp(identifier);
  if (!result.sent) return NextResponse.json({ error: "send" }, { status: 502 });

  return NextResponse.json({ identifier: result.identifier, channel: result.channel });
}
