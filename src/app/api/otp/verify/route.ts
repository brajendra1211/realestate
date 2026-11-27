import { NextResponse } from "next/server";
import { verifyOtp, normalizeIdentifier } from "@/lib/otp";
import { issuePhoneProof } from "@/lib/phoneProof";

// Registration screens: check the WhatsApp OTP once, right after it is typed, and hand back a short-lived
// proof so the next steps of the form can be unlocked. The register endpoints accept this proof as `phoneProof`.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const digits = String(body?.phone ?? "").replace(/\D/g, "").slice(-10);
  const code = String(body?.code ?? "").trim();
  if (digits.length !== 10 || code.length < 4) {
    return NextResponse.json({ error: "Enter the 10-digit mobile number and the OTP." }, { status: 400 });
  }
  const ok = await verifyOtp(normalizeIdentifier(digits), code);
  if (!ok) return NextResponse.json({ error: "That OTP is not correct or has expired." }, { status: 400 });
  return NextResponse.json({ verified: true, proof: issuePhoneProof(digits) });
}
