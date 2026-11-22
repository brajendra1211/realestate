import { NextResponse } from "next/server";
import { startListingRequestAction, type RequestFormInput } from "@/app/list-property/request/actions";

// Mobile app: register (OTP-verified) or reuse the signed-in owner, save the request, return the Razorpay order.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RequestFormInput | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  try {
    const result = await startListingRequestAction(body);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Something went wrong." }, { status: 500 });
  }
}
