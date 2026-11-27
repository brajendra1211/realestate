import { NextResponse } from "next/server";
import { sendRequestOtpAction } from "@/app/list-property/request/actions";

// Mobile app: WhatsApp OTP that proves the owner's number before an account is created.
export async function POST(request: Request) {
  const { phone } = (await request.json().catch(() => ({}))) as { phone?: string };
  try {
    return NextResponse.json(await sendRequestOtpAction(String(phone ?? "")));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not send the OTP." }, { status: 400 });
  }
}
