import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createDispatchOrder, startDispatchSimulated, DispatchServiceError, BUZZER_ERROR_TEXT } from "@/lib/dispatch";
import { isRazorpayConfigured } from "@/lib/razorpay";

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const purpose = ["RENT", "BUY", "SELL", "LETOUT"].includes(body.purpose) ? body.purpose : "RENT";
  const form = {
    purpose,
    radiusKm: Number(body.radiusKm) || 5,
    societyName: typeof body.societyName === "string" ? body.societyName : null,
    bhk: Number(body.bhk) || null,
    budgetMin: Number.isFinite(Number(body.budgetMin)) && body.budgetMin != null ? Number(body.budgetMin) : null,
    budgetMax: Number.isFinite(Number(body.budgetMax)) && body.budgetMax != null ? Number(body.budgetMax) : null,
    budgetLabel: typeof body.budgetLabel === "string" ? body.budgetLabel : null,
  };

  try {
    if (!isRazorpayConfigured()) {
      const dispatch = await startDispatchSimulated({ buyerId: session.user.id, latitude, longitude, ...form });
      return NextResponse.json({ simulated: true, dispatchRequestId: dispatch.id }, { status: 201 });
    }

    const { order, keyId } = await createDispatchOrder({ buyerId: session.user.id, latitude, longitude, ...form });
    if (!order || !keyId) {
      return NextResponse.json({ error: "paymentUnavailable" }, { status: 503 });
    }
    return NextResponse.json({ simulated: false, order, keyId }, { status: 201 });
  } catch (error) {
    if (error instanceof DispatchServiceError) {
      return NextResponse.json({ error: error.message, message: BUZZER_ERROR_TEXT[error.message] ?? error.message }, { status: error.message.startsWith("buzzer") ? 429 : 400 });
    }
    console.error("Creating dispatch failed", error);
    return NextResponse.json({ error: "Failed to start dispatch" }, { status: 500 });
  }
}
