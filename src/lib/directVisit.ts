import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";
import { getSiteSettings } from "@/lib/site-settings";

export class DirectVisitError extends Error {}

function generateSixDigitOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export type RequestDirectVisitInput = {
  buyerId: string;
  agentListingId: string;
  latitude?: number | null;
  longitude?: number | null;
  locationAccuracy?: number | null;
  notes?: string | null;
};

/**
 * PDF 2 Page 10:
 * Direct Customer-Owner Property Visit with OTP Verification & GPS proof
 * Generates OTP and sends to owner/seller to confirm physical customer presence.
 */
export async function requestDirectVisitOtp(input: RequestDirectVisitInput) {
  const listing = await prisma.agentListing.findUnique({
    where: { id: input.agentListingId },
    include: {
      agent: { include: { user: true } },
      masterProperty: true,
    },
  });
  if (!listing) throw new DirectVisitError("Listing not found");

  const buyer = await prisma.user.findUnique({ where: { id: input.buyerId } });
  if (!buyer) throw new DirectVisitError("Buyer not found");

  // Determine owner/seller contact phone
  const ownerPhone = listing.agent?.user?.phone || listing.agent?.alternatePhone || null;

  const otp = generateSixDigitOtp();

  const visit = await prisma.directPropertyVisit.create({
    data: {
      agentListingId: listing.id,
      buyerId: buyer.id,
      ownerPhone,
      otp,
      otpVerified: false,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      locationAccuracy: input.locationAccuracy ?? null,
      notes: input.notes?.trim() || null,
    },
  });

  // Notify owner/agent that a customer is at their property to visit
  if (listing.agent?.user) {
    await notifyUser(
      listing.agent.user,
      `Property Visit OTP: Customer ${buyer.name} (${buyer.phone || "App User"}) has arrived at "${listing.title}". Verification OTP is: ${otp}. Provide this OTP to verify the visit.`,
      "Property Visit Verification Code"
    );
  }

  // Also notify buyer
  await notifyUser(
    buyer,
    `Your visit request for "${listing.title}" was registered with GPS coordinates. Ask the owner/representative for the 6-digit OTP to verify your presence.`,
    "Direct Visit Registered"
  );

  return {
    visitId: visit.id,
    status: "OTP_SENT",
    message: "OTP sent to property representative/owner.",
  };
}

/**
 * Verifies the direct visit OTP and automatically generates the Platform Anti-Bypass Agreement
 * (PDF 2 Page 10 & 11)
 */
export async function verifyDirectVisitOtp(visitId: string, enteredOtp: string) {
  const visit = await prisma.directPropertyVisit.findUnique({
    where: { id: visitId },
    include: {
      buyer: true,
      agentListing: {
        include: {
          agent: { include: { user: true } },
          masterProperty: true,
        },
      },
    },
  });
  if (!visit) throw new DirectVisitError("Visit record not found");
  if (visit.otpVerified) throw new DirectVisitError("Visit already verified");

  if (visit.otp !== enteredOtp.trim()) {
    throw new DirectVisitError("Invalid OTP entered. Please check with the owner.");
  }

  const now = new Date();
  const listing = visit.agentListing;
  const buyer = visit.buyer;
  const settings = await getSiteSettings();

  // 1. Mark visit as OTP verified
  await prisma.directPropertyVisit.update({
    where: { id: visit.id },
    data: {
      otpVerified: true,
      otpVerifiedAt: now,
    },
  });

  // 2. Generate Anti-Bypass Legal Agreement Deed (PDF 2 Page 11)
  const legalTermsSummary = `LEGAL ANTI-BYPASS AGREEMENT & PROOF OF INTRODUCTION
Date of Verification: ${now.toISOString()}
Property: ${listing.title}
Address: ${listing.exactAddress}
GPS Coordinates: ${visit.latitude ?? "N/A"}, ${visit.longitude ?? "N/A"}

TERMS & CONDITIONS:
1. Proof of Introduction: The Buyer (${buyer.name}, Phone: ${buyer.phone || "N/A"}) and Seller/Owner (${listing.agent?.user?.name || "Owner"}, Phone: ${visit.ownerPhone || "N/A"}) acknowledge that this property was introduced exclusively through the BayaEstate Platform.
2. Mandatory Service Fee: If the Buyer and Seller/Owner execute any sale, purchase, agreement to sell, or conveyance deed for this property within 12 months from this date, a standard platform service fee of ${settings.brokeragePercent}% is legally due and payable to BayaEstate.
3. Anti-Bypass Protection: Any private or offline circumvention to evade platform fees constitutes a willful breach of contract, enforceable in court using this GPS-tagged, OTP-verified digital audit deed as conclusive proof of introduction.`;

  const agreement = await prisma.platformAntiBypassAgreement.create({
    data: {
      directVisitId: visit.id,
      agentListingId: listing.id,
      buyerId: buyer.id,
      sellerPhone: visit.ownerPhone || "Platform Verified",
      sellerName: listing.agent?.user?.name || "Property Owner",
      buyerName: buyer.name,
      buyerPhone: buyer.phone,
      propertyAddress: listing.exactAddress,
      legalTermsSummary,
      serviceFeePercent: settings.brokeragePercent,
      buyerSigned: true,
      buyerSignedAt: now,
      sellerSigned: false,
      status: "ACTIVE",
    },
  });

  // Notify buyer and owner of generated agreement
  await notifyUser(
    buyer,
    `Site visit for "${listing.title}" successfully verified! Anti-Bypass Platform Agreement has been generated for your transaction security.`,
    "Visit Verified & Protected"
  );

  if (listing.agent?.user) {
    await notifyUser(
      listing.agent.user,
      `Site visit by ${buyer.name} verified via OTP. Anti-Bypass Agreement deed created under Agreement ID: ${agreement.id}.`,
      "Site Visit Verified & Protected"
    );
  }

  return {
    success: true,
    visitId: visit.id,
    agreementId: agreement.id,
    verifiedAt: now,
    agreement,
  };
}

export async function signPlatformAgreement(agreementId: string, role: "BUYER" | "SELLER") {
  const agreement = await prisma.platformAntiBypassAgreement.findUnique({
    where: { id: agreementId },
  });
  if (!agreement) throw new DirectVisitError("Agreement not found");

  const now = new Date();
  const updateData: any = {};
  if (role === "BUYER") {
    updateData.buyerSigned = true;
    updateData.buyerSignedAt = now;
  } else if (role === "SELLER") {
    updateData.sellerSigned = true;
    updateData.sellerSignedAt = now;
  }

  return prisma.platformAntiBypassAgreement.update({
    where: { id: agreementId },
    data: updateData,
  });
}

export async function getDirectVisitsForBuyer(buyerId: string) {
  return prisma.directPropertyVisit.findMany({
    where: { buyerId },
    include: {
      agentListing: { select: { id: true, slug: true, title: true, exactAddress: true, price: true } },
      antiBypassAgreements: true,
    },
    orderBy: { createdAt: "desc" },
  });
}
