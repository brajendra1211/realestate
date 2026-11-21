import { NextResponse } from "next/server";
import { advanceListingRequests } from "@/lib/listingRequest";

// Moves owner listing requests along: widens the buzzer 5 -> 10 -> 15 km and re-buzzes any request
// that nobody verified within 48 hours. Call it every minute (cron / scheduler) with the CRON_SECRET.
// The admin and owner pages also run the same function whenever they refresh.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const changed = await advanceListingRequests();
  return NextResponse.json({ ok: true, changed });
}
