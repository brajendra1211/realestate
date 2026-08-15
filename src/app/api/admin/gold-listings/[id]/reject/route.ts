import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rejectGoldListing } from "@/lib/goldListing";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const listing = await rejectGoldListing(id);
  return NextResponse.json(listing);
}
