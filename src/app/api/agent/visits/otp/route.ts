import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requestVisitOtp } from "@/lib/visitLog";

export async function POST(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const customerPhone = String(body.customerPhone ?? "").trim();
  if (!customerPhone) return NextResponse.json({ error: "validation" }, { status: 400 });

  const result = await requestVisitOtp(customerPhone);
  if (!result.sent) return NextResponse.json({ error: "send" }, { status: 502 });

  return NextResponse.json({ identifier: result.identifier, channel: result.channel });
}
