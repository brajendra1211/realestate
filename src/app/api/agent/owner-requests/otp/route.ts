import { NextResponse } from "next/server";
import { requireAgentApi, fail } from "@/lib/agentApi";
import { sendVerifyOtp } from "@/lib/listingRequest";

// The partner is at the property: sends the OTP to the owner's WhatsApp.
export async function POST(request: Request) {
  const g = await requireAgentApi();
  if ("error" in g) return g.error;
  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id) return fail(null, "Missing id");
  try {
    await sendVerifyOtp(id, g.agent.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
