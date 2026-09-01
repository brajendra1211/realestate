import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAgreementUrgency } from "@/lib/listingDelist";

/**
 * GET /api/listings/hot-deals
 * PDF 2 Page 12 & 13:
 * 6-Month Agreement Countdown Engine:
 * Returns properties ordered by agreementExpiryDate ASC (closest to expiry shows first)
 * with visual urgency tags (Green Months 1-3, Yellow Months 4-5, Red Month 6 Hot Deal).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const listingType = searchParams.get("listingType") as "SALE" | "RENT" | null;

  try {
    const listings = await prisma.agentListing.findMany({
      where: {
        approvalStatus: "APPROVED",
        isDelisted: false,
        agreementExpiryDate: { not: null },
        ...(city ? { masterProperty: { city } } : {}),
        ...(listingType ? { listingType } : {}),
      },
      include: {
        images: true,
        masterProperty: true,
        agent: { select: { agentCode: true, primeStatus: true, visibilityDeprioritized: true, ratingAvg: true } },
      },
      orderBy: [
        { agent: { visibilityDeprioritized: "asc" } },
        { agreementExpiryDate: "asc" },
        { agent: { primeStatus: "desc" } },
        { createdAt: "desc" },
      ],
      take: 50,
    });

    const enriched = listings.map((item) => ({
      ...item,
      urgency: getAgreementUrgency(item.agreementExpiryDate, item.agreementStartDate),
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Failed to fetch hot deals", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
