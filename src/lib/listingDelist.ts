import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";
import { getSiteSettings } from "@/lib/site-settings";
import type { ListingPlanTier } from "@/generated/prisma";

export interface AgreementUrgencyInfo {
  tier: "NORMAL" | "PRIORITY" | "HOT_DEAL" | "EXPIRED";
  badge: string;
  color: "green" | "yellow" | "red" | "gray";
  daysRemaining: number;
  monthsElapsed: number;
}

/**
 * Calculates the 6-Month Agreement visual indicator & urgency tier:
 * - Green (Months 1–3, > 90 days remaining): Normal listing mode
 * - Yellow (Months 4–5, 31–90 days remaining): "Priority Listing"
 * - Red (Month 6, <= 30 days remaining): "Hot Deal / Urgent Sale"
 * (PDF 2 Page 12 & 13)
 */
export function getAgreementUrgency(
  agreementExpiryDate: Date | null,
  agreementStartDate?: Date | null
): AgreementUrgencyInfo {
  if (!agreementExpiryDate) {
    return {
      tier: "NORMAL",
      badge: "Standard",
      color: "green",
      daysRemaining: 180,
      monthsElapsed: 0,
    };
  }

  const now = new Date();
  const diffMs = agreementExpiryDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let monthsElapsed = 0;
  if (agreementStartDate) {
    const elapsedMs = now.getTime() - agreementStartDate.getTime();
    monthsElapsed = Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24 * 30)));
  }

  if (daysRemaining <= 0) {
    return {
      tier: "EXPIRED",
      badge: "Agreement Expired",
      color: "gray",
      daysRemaining: 0,
      monthsElapsed: 6,
    };
  }

  if (daysRemaining <= 30) {
    return {
      tier: "HOT_DEAL",
      badge: "Hot Deal / Urgent Sale",
      color: "red",
      daysRemaining,
      monthsElapsed: Math.max(5, monthsElapsed),
    };
  }

  if (daysRemaining <= 90) {
    return {
      tier: "PRIORITY",
      badge: "Priority Listing",
      color: "yellow",
      daysRemaining,
      monthsElapsed: Math.max(3, monthsElapsed),
    };
  }

  return {
    tier: "NORMAL",
    badge: "Active Listing",
    color: "green",
    daysRemaining,
    monthsElapsed: Math.min(3, monthsElapsed),
  };
}

/**
 * Auto-Delisting Engine — checks all active listings whose validity has expired.
 * Basic (30 Days) / Gold (90 Days).
 * Expired listings are marked isDelisted: true (never permanently deleted from DB).
 * (PDF 1 Page 1 & 2, PDF 2 Page 13)
 */
export async function checkAndDelistExpiredListings() {
  const now = new Date();
  const expiredListings = await prisma.agentListing.findMany({
    where: {
      isDelisted: false,
      listingExpiresAt: { lte: now },
    },
    include: {
      agent: { include: { user: { select: { phone: true, email: true } } } },
    },
  });

  let delistedCount = 0;
  for (const listing of expiredListings) {
    await prisma.agentListing.update({
      where: { id: listing.id },
      data: {
        isDelisted: true,
        delistedAt: now,
      },
    });

    delistedCount += 1;

    if (listing.agent?.user) {
      await notifyUser(
        listing.agent.user,
        `Your listing "${listing.title}" (Code: ${listing.slug}) has reached its validity expiry and is now auto-delisted. Single-tap to renew with a fresh code and keep your 60-day target count active!`,
        "Listing Auto-Delisted"
      );
    }
  }

  return { delistedCount };
}

/**
 * Pre-Expiry Warning Engine (PDF 1 Page 7 & PDF 2 Page 13):
 * - 7 Days Before Expiry: WhatsApp & App Notification
 * - 2 Days Before Expiry (48 Hours): Urgency Alert with 20% discount reminder
 */
export async function checkUpcomingListingExpiries() {
  const now = new Date();
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const upcomingExpiries = await prisma.agentListing.findMany({
    where: {
      isDelisted: false,
      listingExpiresAt: {
        gt: now,
        lte: sevenDaysOut,
      },
    },
    include: {
      agent: { include: { user: { select: { phone: true, email: true } } } },
    },
  });

  let warnings7d = 0;
  let warnings2d = 0;

  for (const listing of upcomingExpiries) {
    if (!listing.listingExpiresAt || !listing.agent?.user) continue;

    const daysRemaining = Math.max(
      1,
      Math.ceil((listing.listingExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    // 2-day / 48-hour alert with 20% Discount Coupon (PDF 1 Page 7)
    if (daysRemaining <= 2 && !listing.expiryWarning2dSentAt) {
      let couponCode = "";
      if (listing.agentId) {
        const { issuePreExpiryDiscountCoupon } = await import("@/lib/targetCycle");
        const coupon = await issuePreExpiryDiscountCoupon(listing.agentId);
        couponCode = coupon.code;
      }

      await notifyUser(
        listing.agent.user,
        `Sirf 48 ghante bache hain! Aapki property listing "${listing.title}" 2 dino mein expire ho jayegi. 20% DISCOUNT COUPON (${couponCode}) activate ho chuka hai! Abhi renew karein aur apna 60-day cycle target streak maintain rakhein.`,
        "20% Discount Activated — Listing Expiry in 48 Hours"
      );
      await prisma.agentListing.update({
        where: { id: listing.id },
        data: { expiryWarning2dSentAt: now },
      });
      warnings2d += 1;
    }
    // 7-day alert
    else if (daysRemaining <= 7 && daysRemaining > 2 && !listing.expiryWarning7dSentAt) {
      await notifyUser(
        listing.agent.user,
        `Aapki property listing "${listing.title}" (Code: ${listing.slug}) 7 dino mein expire ho rahi hai. Fast views continue rakhne ke liye renew karein.`,
        "Listing Expiry in 7 Days"
      );
      await prisma.agentListing.update({
        where: { id: listing.id },
        data: { expiryWarning7dSentAt: now },
      });
      warnings7d += 1;
    }
  }

  return { warnings7d, warnings2d };
}

/**
 * 6-Month Agreement Alerts Engine (PDF 2 Page 12 & 13):
 * - 30 Days remaining: SMS/WhatsApp to sales team & agents (Urgent sale / Hot Deal)
 * - 15 Days remaining: Final push alert
 */
export async function checkAgreementExpiryAlerts() {
  const now = new Date();
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const activeAgreements = await prisma.agentListing.findMany({
    where: {
      isDelisted: false,
      agreementExpiryDate: {
        gt: now,
        lte: thirtyDaysOut,
      },
    },
    include: {
      agent: { include: { user: { select: { phone: true, email: true } } } },
    },
  });

  let alerts30d = 0;
  let alerts15d = 0;

  for (const listing of activeAgreements) {
    if (!listing.agreementExpiryDate || !listing.agent?.user) continue;

    const daysRemaining = Math.max(
      1,
      Math.ceil((listing.agreementExpiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    if (daysRemaining <= 15 && !listing.hotDealAlert15dSentAt) {
      await notifyUser(
        listing.agent.user,
        `Urgent Action Required: Property #${listing.id} ("${listing.title}") has only 15 days remaining on its 6-month agreement. Final buyer push required before agreement expires!`,
        "15 Days Agreement Alert"
      );
      await prisma.agentListing.update({
        where: { id: listing.id },
        data: { hotDealAlert15dSentAt: now },
      });
      alerts15d += 1;
    } else if (daysRemaining <= 30 && daysRemaining > 15 && !listing.hotDealAlert30dSentAt) {
      await notifyUser(
        listing.agent.user,
        `Hot Deal Alert: Property #${listing.id} ("${listing.title}") has 30 days remaining on its 6-month agreement. It is now tagged as "Hot Deal / Urgent Sale" with top priority in search feeds.`,
        "30 Days Hot Deal Alert"
      );
      await prisma.agentListing.update({
        where: { id: listing.id },
        data: { hotDealAlert30dSentAt: now },
      });
      alerts30d += 1;
    }
  }

  return { alerts30d, alerts15d };
}

/**
 * Re-list or Renew a Listing (PDF 1 Page 1 & 2):
 * Basic (₹200, 30 days) vs Gold (₹500, 90 days)
 * 50% credited to agent wallet, 50% to company.
 */
export async function renewPropertyListing(
  listingId: string,
  planTier: ListingPlanTier,
  agentProfileId: string
) {
  const listing = await prisma.agentListing.findUnique({
    where: { id: listingId },
  });
  if (!listing) throw new Error("Listing not found");

  const settings = await getSiteSettings();
  const fee = planTier === "GOLD" ? settings.goldListingFee : settings.basicListingFee;
  const validityDays = planTier === "GOLD" ? 90 : 30;

  const splitPercent = settings.listingSplitPercent ?? 50;
  const agentSplit = Math.round(fee * (splitPercent / 100));
  const companySplit = fee - agentSplit;

  const now = new Date();
  const newExpiry = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);

  const updated = await prisma.$transaction([
    prisma.agentListing.update({
      where: { id: listingId },
      data: {
        listingPlan: planTier,
        listingFee: fee,
        listingAgentSplit: agentSplit,
        listingCompanySplit: companySplit,
        listingExpiresAt: newExpiry,
        isDelisted: false,
        delistedAt: null,
        expiryWarning7dSentAt: null,
        expiryWarning2dSentAt: null,
      },
    }),
    // Credit 50% split to agent wallet if renewed
    prisma.agentProfile.update({
      where: { id: agentProfileId },
      data: { walletBalance: { increment: agentSplit } },
    }),
    prisma.commissionLedgerEntry.create({
      data: {
        agentId: agentProfileId,
        type: planTier === "GOLD" ? "GOLD_SPLIT" : "UNLOCK_SPLIT",
        amount: agentSplit,
        refId: listingId,
        note: `50% split for ${planTier} listing renewal on "${listing.title}"`,
      },
    }),
  ]);

  return updated[0];
}
