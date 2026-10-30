import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { getOwnerPlans } from "@/lib/ownerPlans";
import { getAgentPlans } from "@/lib/agentPlans";

/**
 * Real-time Plans API for Mobile App and Web Frontend:
 * Returns the exact live plans, limits, and pricing configured by Admin.
 */
export async function GET() {
  try {
    const [settings, ownerPlans, agentPlans] = await Promise.all([
      getSiteSettings(),
      getOwnerPlans(),
      getAgentPlans(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ownerPlans: ownerPlans.map((p) => ({
          id: p.id,
          name: p.name,
          role: "OWNER",
          price: p.effectivePrice,
          durationDays: p.effectiveDurationDays,
          listingLimit: p.listingLimit,
          isGold: p.isGold,
        })),
        agentPlans: agentPlans.map((p) => ({
          id: p.id,
          name: p.name,
          role: "AGENT",
          tier: p.tier,
          price: p.price,
          durationDays: p.durationDays,
          listingLimit: p.listingLimit,
          splitPercent: p.splitPercent,
          referralAmount: p.referralAmount,
        })),
        settings: {
          basicListingFee: settings.basicListingFee,
          goldListingFee: settings.goldListingFee,
          agentBasicPlanPrice: settings.agentBasicPlanPrice,
          agentPrimePlanPrice: settings.agentPrimePlanPrice,
          agentPlanSplitPercent: settings.agentPlanSplitPercent,
          listingSplitPercent: settings.listingSplitPercent,
          unlockPassAmount: settings.unlockPassAmount,
          brokeragePercent: settings.brokeragePercent,
        },
      },
    });
  } catch (error) {
    console.error("Failed to fetch real-time plans:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}
