import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requestDirectVisitOtp, DirectVisitError } from "@/lib/directVisit";

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  if (!body.agentListingId) {
    return NextResponse.json({ error: "agentListingId is required" }, { status: 400 });
  }

  try {
    const result = await requestDirectVisitOtp({
      buyerId: session.user.id,
      agentListingId: String(body.agentListingId),
      latitude: body.latitude ? Number(body.latitude) : null,
      longitude: body.longitude ? Number(body.longitude) : null,
      locationAccuracy: body.locationAccuracy ? Number(body.locationAccuracy) : null,
      notes: body.notes ? String(body.notes) : null,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof DirectVisitError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to request direct visit OTP", error);
    return NextResponse.json({ error: "Failed to request direct visit OTP" }, { status: 500 });
  }
}
