import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rejectGoldListing } from "@/lib/goldListing";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const listing = await rejectGoldListing(id, body.reason ? String(body.reason) : undefined);
  return NextResponse.json(listing);
}
