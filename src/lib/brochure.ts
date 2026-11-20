import { prisma } from "@/lib/prisma";
import {
  createRazorpayOrder,
  getRazorpayKeyId,
  isRazorpayConfigured,
  verifyPaidOrder,
} from "@/lib/razorpay";

// Rs 100 buys 10 brochures; when the pack is used up the partner recharges again.
export const BROCHURE_PACK_PRICE = 100;
export const BROCHURE_PACK_CREDITS = 10;

export class BrochureError extends Error {}

export type BrochureData = {
  title: string;
  listingType: string; // RENT | SALE ...
  propertyType: string;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqft: number | null;
  price: number;
  locality: string | null;
  city: string;
  society: string | null;
  furnishing: string | null;
  floor: string | null;
  amenities: string[];
  nearby: string[];
  images: string[];
  propertyCode: string | null;
  agent: { name: string; code: string | null; phone: string | null; shop: string | null };
};

function splitList(s?: string | null): string[] {
  return (s ?? "")
    .split(/[,\n;|]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 12);
}

// Agent may type a property code (e.g. the master id), a listing slug, or paste
// the whole listing URL — all resolve to the same thing.
function normalizeRef(input: string) {
  let v = input.trim();
  if (!v) return "";
  try {
    if (/^https?:\/\//i.test(v)) {
      const u = new URL(v);
      v = u.pathname.split("/").filter(Boolean).pop() ?? "";
    }
  } catch {
    /* keep raw */
  }
  return v.split("?")[0].trim();
}

export async function resolvePropertyForBrochure(input: string): Promise<Omit<BrochureData, "agent"> & { sourceType: string; sourceRef: string }> {
  const ref = normalizeRef(input);
  if (!ref) throw new BrochureError("Property code ya listing link daaliye.");

  // 1. Channel-partner marketplace listing: by slug or by the property's master code.
  const listing = await prisma.agentListing.findFirst({
    where: {
      isDelisted: false,
      OR: [{ slug: ref }, { masterProperty: { masterId: { equals: ref } } }],
    },
    include: { masterProperty: true, images: { orderBy: { order: "asc" }, take: 3 } },
    orderBy: { createdAt: "desc" },
  });
  if (listing) {
    return {
      sourceType: "AGENT_LISTING",
      sourceRef: listing.slug,
      title: listing.title,
      listingType: String(listing.listingType),
      propertyType: String(listing.propertyType),
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      areaSqft: listing.superAreaSqft ?? listing.areaSqft,
      price: listing.price,
      locality: listing.masterProperty.locality,
      city: listing.masterProperty.city,
      society: listing.societyName,
      furnishing: listing.furnishing,
      floor:
        listing.floorNumber != null
          ? `${listing.floorNumber}${listing.totalFloors ? ` of ${listing.totalFloors}` : ""}`
          : null,
      amenities: splitList(listing.amenities),
      nearby: splitList(listing.nearbyAmenities),
      images: listing.images.map((i) => i.url),
      propertyCode: listing.masterProperty.masterId,
    };
  }

  // 2. Website property by slug.
  const prop = await prisma.property.findFirst({
    where: { slug: ref },
    include: { images: { take: 3 } },
  });
  if (prop) {
    return {
      sourceType: "PROPERTY",
      sourceRef: prop.slug,
      title: prop.title,
      listingType: String(prop.listingType),
      propertyType: String(prop.propertyType),
      bedrooms: prop.bedrooms,
      bathrooms: prop.bathrooms,
      areaSqft: prop.superAreaSqft ?? prop.areaSqft,
      price: prop.price,
      locality: prop.locality,
      city: prop.city,
      society: prop.societyName,
      furnishing: prop.furnishing,
      floor:
        prop.floorNumber != null ? `${prop.floorNumber}${prop.totalFloors ? ` of ${prop.totalFloors}` : ""}` : null,
      amenities: splitList(prop.amenities),
      nearby: splitList(prop.nearbyAmenities),
      images: prop.images.map((i) => i.url),
      propertyCode: null,
    };
  }

  throw new BrochureError("Ye property nahi mili. Sahi property code ya listing link daaliye.");
}

/** Spends one credit and stores the brochure. Credit is only taken if the property resolves. */
export async function createBrochure(agentId: string, input: string) {
  const [agent, resolved] = await Promise.all([
    prisma.agentProfile.findUnique({
      where: { id: agentId },
      select: { agentCode: true, shopName: true, brochureCredits: true, user: { select: { name: true, phone: true } } },
    }),
    resolvePropertyForBrochure(input),
  ]);
  if (!agent) throw new BrochureError("Agent nahi mila.");
  if (agent.brochureCredits < 1) {
    throw new BrochureError(
      `Credits khatam. ₹${BROCHURE_PACK_PRICE} recharge karke ${BROCHURE_PACK_CREDITS} aur brochure banaiye.`
    );
  }

  const { sourceType, sourceRef, ...rest } = resolved;
  const data: BrochureData = {
    ...rest,
    agent: {
      name: agent.user.name ?? "Channel Partner",
      code: agent.agentCode,
      phone: agent.user.phone,
      shop: agent.shopName,
    },
  };

  return prisma.$transaction(async (tx) => {
    const spent = await tx.agentProfile.updateMany({
      where: { id: agentId, brochureCredits: { gte: 1 } },
      data: { brochureCredits: { decrement: 1 } },
    });
    if (spent.count !== 1) throw new BrochureError("Credits khatam. Recharge kijiye.");
    return tx.brochure.create({
      data: { agentId, sourceType, sourceRef, title: data.title, data: JSON.stringify(data) },
    });
  });
}

export async function createBrochureRechargeOrder(agentId: string) {
  if (!isRazorpayConfigured()) throw new BrochureError("Online payment abhi set up nahi hai. Thodi der baad try kijiye.");
  const order = await createRazorpayOrder(BROCHURE_PACK_PRICE, `brochure_${agentId}_${Date.now()}`);
  if (!order) throw new BrochureError("Payment abhi available nahi hai. Thodi der baad try kijiye.");
  return {
    order,
    keyId: getRazorpayKeyId(),
    amount: BROCHURE_PACK_PRICE,
    credits: BROCHURE_PACK_CREDITS,
  };
}

export async function confirmBrochureRecharge(
  agentId: string,
  p: { razorpayOrderId?: string | null; razorpayPaymentId?: string | null; razorpaySignature?: string | null }
) {
  if (!p.razorpayOrderId || !p.razorpayPaymentId || !p.razorpaySignature) {
    throw new BrochureError("Payment details missing.");
  }
  const ok = await verifyPaidOrder({
    orderId: p.razorpayOrderId,
    paymentId: p.razorpayPaymentId,
    signature: p.razorpaySignature,
    amountRupees: BROCHURE_PACK_PRICE,
    receiptPrefix: `brochure_${agentId}_`,
  });
  if (!ok) throw new BrochureError("Payment verify nahi hui.");
  const dup = await prisma.brochureRecharge.findFirst({ where: { razorpayPaymentId: p.razorpayPaymentId } });
  if (dup) return dup; // same payment can never credit twice
  return grantBrochureCredits(agentId, {
    amount: BROCHURE_PACK_PRICE,
    credits: BROCHURE_PACK_CREDITS,
    source: "PAID",
    razorpayOrderId: p.razorpayOrderId,
    razorpayPaymentId: p.razorpayPaymentId,
  });
}

export async function grantBrochureCredits(
  agentId: string,
  d: { amount: number; credits: number; source: "PAID" | "ADMIN"; razorpayOrderId?: string | null; razorpayPaymentId?: string | null; note?: string | null }
) {
  return prisma.$transaction(async (tx) => {
    await tx.agentProfile.update({ where: { id: agentId }, data: { brochureCredits: { increment: d.credits } } });
    return tx.brochureRecharge.create({
      data: {
        agentId,
        amount: d.amount,
        credits: d.credits,
        source: d.source,
        razorpayOrderId: d.razorpayOrderId ?? null,
        razorpayPaymentId: d.razorpayPaymentId ?? null,
        note: d.note ?? null,
      },
    });
  });
}
