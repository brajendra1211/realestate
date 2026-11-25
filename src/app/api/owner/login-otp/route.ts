import { NextResponse } from "next/server";
import { requestLoginOtp } from "@/lib/loginOtp";

// Mobile app: OTP sign-in for an existing owner (never creates an account).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await requestLoginOtp("OWNER", String(body?.identifier ?? ""));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ identifier: result.identifier, channel: result.channel });
}
