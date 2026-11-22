import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/site-settings";

// Public: the owner plan prices shown on the app's plan screen.
export async function GET() {
  const s = await getSiteSettings();
  return NextResponse.json({
    plans: [
      { id: "BASIC", name: "Basic", price: s.basicListingFee, months: 1 },
      { id: "GOLD", name: "Pro", price: s.goldListingFee, months: 3 },
    ],
  });
}
