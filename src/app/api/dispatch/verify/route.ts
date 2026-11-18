import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { verifyAndStartDispatch, DispatchServiceError } from "@/lib/dispatch";

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const dispatch = await verifyAndStartDispatch(
      {
        buyerId: session.user.id,
        latitude: Number(body.latitude),
        longitude: Number(body.longitude),
        purpose: ["RENT", "BUY", "SELL", "LETOUT"].includes(body.purpose) ? (body.purpose as "RENT" | "BUY" | "SELL" | "LETOUT") : ("RENT" as const),
        radiusKm: Number(body.radiusKm) || 5,
        societyName: typeof body.societyName === "string" ? body.societyName : null,
        bhk: Number(body.bhk) || null,
        budgetMin: body.budgetMin != null ? Number(body.budgetMin) : null,
        budgetMax: body.budgetMax != null ? Number(body.budgetMax) : null,
        budgetLabel: typeof body.budgetLabel === "string" ? body.budgetLabel : null,
      },
      String(body.razorpayOrderId ?? ""),
      String(body.razorpayPaymentId ?? ""),
      String(body.razorpaySignature ?? "")
    );
    return NextResponse.json({ dispatchRequestId: dispatch.id }, { status: 201 });
  } catch (error) {
    if (error instanceof DispatchServiceError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
