import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGoldListingsForModeration } from "@/lib/goldListing";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const listings = await getGoldListingsForModeration();
  return NextResponse.json(listings);
}
