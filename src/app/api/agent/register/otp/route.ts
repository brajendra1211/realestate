import { NextResponse } from "next/server";
import { sendAgentRegistrationOtp, AgentServiceError } from "@/lib/agent";

// Mobile app: WhatsApp OTP that proves the partner's mobile number before the account is created.
export async function POST(request: Request) {
  const { phone } = (await request.json().catch(() => ({}))) as { phone?: string };
  try {
    await sendAgentRegistrationOtp(String(phone ?? ""));
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AgentServiceError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Agent registration OTP failed", error);
    return NextResponse.json({ error: "otpSendFailed" }, { status: 500 });
  }
}
