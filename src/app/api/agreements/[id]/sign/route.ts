import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { signPlatformAgreement, DirectVisitError } from "@/lib/directVisit";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const role = session.user.role === "BUYER" ? "BUYER" : "SELLER";

  try {
    const updated = await signPlatformAgreement(id, role);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof DirectVisitError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Failed to sign agreement", error);
    return NextResponse.json({ error: "Failed to sign agreement" }, { status: 500 });
  }
}
