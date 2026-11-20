import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/seo";
import { notifyUser } from "@/lib/notify";
import { sendPushToUser } from "@/lib/push";
import { emitToAgent } from "@/lib/socket";
import { findNearbyAgents } from "@/lib/agentGeo";
import { geocodeLocation } from "@/lib/geocode";
import { getSiteSettings } from "@/lib/site-settings";
import { createAgentListing, type CreateAgentListingInput } from "@/lib/listing";
import { createRazorpayOrder, isRazorpayConfigured, verifyPaidOrder } from "@/lib/razorpay";
import type { ListingPlanTier, ListingRequest, ListingRequestStatus } from "@/generated/prisma";

/**
 * Assisted owner listing:
 *   RENT: owner pays for a plan -> nearest partners get a buzzer -> first to accept calls
 *   the owner and sends a one-time link -> owner fills the details there -> the
 *   listing is created under that partner's ID (plan fee split 50-50).
 *   SELL: same plans and prices, but the request goes ONLY to the admin team (status
 *   ADMIN_DESK). No partner is ever alerted, can see it or accept it.
 */
export class ListingRequestError extends Error {}

export const REQUEST_STATUS_LABEL: Record<ListingRequestStatus, string> = {
  PENDING_PAYMENT: "Payment pending",
  SEARCHING: "Finding a partner",
  ACCEPTED: "Partner assigned",
  LINK_SENT: "Details link sent",
  SUBMITTED: "Listing created",
  CANCELLED: "Cancelled",
  ADMIN_DESK: "With our team",
};

const token = () => randomBytes(18).toString("base64url");

// The nearest partners are buzzed first. If none of them picks the request up,
// after this long it opens to every Prime partner so the owner is never left waiting.
export const ESCALATE_AFTER_MS = 2 * 60 * 1000;

/** Prisma filter: SEARCHING requests this partner may see and accept right now. */
export function visibleToAgentWhere(agentProfileId: string) {
  return {
    status: "SEARCHING" as const,
    purpose: "RENT" as const, // sell requests never reach a partner
    OR: [
      { alertedAgentIds: { contains: agentProfileId } },
      { paidAt: { lt: new Date(Date.now() - ESCALATE_AFTER_MS) } },
    ],
  };
}

export const formLink = (r: Pick<ListingRequest, "formToken">) => absoluteUrl(`/list/${r.formToken}`);
export const statusLink = (r: Pick<ListingRequest, "id" | "statusToken">) =>
  absoluteUrl(`/list-property/request/${r.id}?k=${r.statusToken}`);

function alertedIds(r: Pick<ListingRequest, "alertedAgentIds">) {
  return (r.alertedAgentIds ?? "").split(",").filter(Boolean);
}

export async function getPlanFees() {
  const s = await getSiteSettings();
  const split = s.listingSplitPercent ?? 50;
  const calc = (fee: number) => {
    const agent = Math.round(fee * (split / 100));
    return { fee, agent, company: fee - agent };
  };
  return { BASIC: calc(s.basicListingFee), GOLD: calc(s.goldListingFee), splitPercent: split };
}

export type CreateRequestInput = {
  userId?: string | null;
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string | null;
  city: string;
  locality?: string | null;
  plan: ListingPlanTier;
  purpose?: "RENT" | "SELL";
  referredByAgentCode?: string | null;
};

export async function createListingRequest(input: CreateRequestInput) {
  const ownerName = input.ownerName.trim();
  const ownerPhone = input.ownerPhone.replace(/[^\d+]/g, "");
  const city = input.city.trim();
  if (!ownerName || ownerPhone.replace(/\D/g, "").length < 10 || !city) {
    throw new ListingRequestError("Please enter your name, a valid phone number and your city.");
  }

  const fees = await getPlanFees();
  const plan = input.plan === "GOLD" ? "GOLD" : "BASIC";
  const f = fees[plan];

  const where = [input.locality?.trim(), city].filter(Boolean).join(", ");
  const coords = (await geocodeLocation(where).catch(() => null)) ?? (await geocodeLocation(city).catch(() => null));

  return prisma.listingRequest.create({
    data: {
      userId: input.userId ?? null,
      ownerName,
      ownerPhone,
      ownerEmail: input.ownerEmail?.trim() || null,
      city,
      locality: input.locality?.trim() || null,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      plan,
      purpose: input.purpose === "SELL" ? "SELL" : "RENT",
      amount: f.fee,
      agentSplit: f.agent,
      companySplit: f.company,
      referredByAgentCode: input.referredByAgentCode?.trim().toUpperCase() || null,
      statusToken: token(),
      formToken: token(),
    },
  });
}

/** Creates the Razorpay order for this request. Payment is always online: there is no skip/test path. */
export async function createRequestPaymentOrder(requestId: string) {
  const request = await prisma.listingRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "PENDING_PAYMENT") throw new ListingRequestError("This request can't be paid.");
  if (!isRazorpayConfigured()) throw new ListingRequestError("Online payment is not set up yet. Please try again later.");
  const order = await createRazorpayOrder(request.amount, `lreq_${request.id}`);
  if (!order) throw new ListingRequestError("Payment isn't available right now. Please try again shortly.");
  await prisma.listingRequest.update({ where: { id: request.id }, data: { razorpayOrderId: order.id } });
  return { request, order, keyId: process.env.RAZORPAY_KEY_ID ?? null };
}

export async function confirmRequestPaymentRazorpay(requestId: string, orderId: string, paymentId: string, signature: string) {
  const request = await prisma.listingRequest.findUnique({ where: { id: requestId } });
  if (!request || request.razorpayOrderId !== orderId) throw new ListingRequestError("Payment verification failed.");
  const ok = await verifyPaidOrder({
    orderId,
    paymentId,
    signature,
    amountRupees: request.amount,
    receiptPrefix: `lreq_${request.id}`,
  });
  if (!ok) throw new ListingRequestError("Payment verification failed.");
  return markPaid(request.id);
}

async function markPaid(requestId: string) {
  const before = await prisma.listingRequest.findUniqueOrThrow({ where: { id: requestId }, select: { purpose: true } });
  const sell = before.purpose === "SELL";
  const claim = await prisma.listingRequest.updateMany({
    where: { id: requestId, status: "PENDING_PAYMENT" },
    // Sell requests skip the partner search completely and land on the admin desk.
    data: { status: sell ? "ADMIN_DESK" : "SEARCHING", paidAt: new Date() },
  });
  const request = await prisma.listingRequest.findUniqueOrThrow({ where: { id: requestId } });
  if (claim.count === 1) {
    if (sell) await notifyAdminsOfSellRequest(request);
    else await alertAgents(request.id);
  }
  return request;
}

async function notifyAdminsOfSellRequest(request: Pick<ListingRequest, "ownerName" | "ownerPhone" | "city" | "locality">) {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { phone: true, email: true }, take: 5 });
  const where = [request.locality, request.city].filter(Boolean).join(", ");
  const text = `New SELL request from ${request.ownerName} (${request.ownerPhone}) in ${where}. Open Admin > Owner requests > Sell desk.`;
  await Promise.all(admins.map((a) => notifyUser(a, text, "New sell request").catch(() => {})));
}

/** Buzzer: every Prime partner near the owner (widening until someone is found). */
export async function alertAgents(requestId: string, extraAgentIds: string[] = [], opts: { everyone?: boolean } = {}) {
  const request = await prisma.listingRequest.findUniqueOrThrow({ where: { id: requestId } });
  if (request.status !== "SEARCHING" || request.purpose === "SELL") return 0;

  let ids: string[] = [];
  if (!opts.everyone && request.latitude != null && request.longitude != null) {
    for (const radius of [10, 25, 100]) {
      const near = await findNearbyAgents(request.latitude, request.longitude, radius, 30);
      ids = near.map((n) => n.agentProfileId);
      if (ids.length >= 3) break;
    }
  }
  if (ids.length === 0) {
    // No located partner nearby: ring every active Prime partner instead of leaving the owner waiting.
    const all = await prisma.agentProfile.findMany({
      where: { status: "APPROVED", primeStatus: true },
      select: { id: true },
      take: 50,
    });
    ids = all.map((a) => a.id);
  }
  ids = [...new Set([...ids, ...extraAgentIds, ...alertedIds(request)])];
  await prisma.listingRequest.update({
    where: { id: request.id },
    data: { alertedAgentIds: ids.join(","), buzzCount: { increment: 1 }, lastBuzzAt: new Date() },
  });

  const agents = await prisma.agentProfile.findMany({
    where: { id: { in: ids }, status: "APPROVED", buzzerAlerts: true },
    include: { user: { select: { id: true, phone: true, email: true } } },
  });
  const where = [request.locality, request.city].filter(Boolean).join(", ");
  const text = `New owner wants to list a property in ${where}. Open Owner Requests in your partner panel and accept it first to call them.`;
  await Promise.all(
    agents.map(async (a) => {
      emitToAgent(a.id, "listing-request:new", { id: request.id, city: request.city, locality: request.locality });
      await sendPushToUser(a.user.id, { title: "New owner listing request", body: text }, { type: "listing-request", requestId: request.id }).catch(() => {});
      await notifyUser(a.user, text, "New owner listing request").catch(() => {});
    }),
  );
  return agents.length;
}

export const REBUZZ_COOLDOWN_MS = 60 * 1000;

/**
 * The owner rings again — no new payment. Allowed any time until a partner accepts,
 * with a short cooldown so partners aren't spammed. Goes out to every Prime partner.
 */
export async function rebuzzRequest(requestId: string) {
  const request = await prisma.listingRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new ListingRequestError("Request not found.");
  if (request.status !== "SEARCHING") throw new ListingRequestError("A partner has already picked up this request.");
  const wait = request.lastBuzzAt ? request.lastBuzzAt.getTime() + REBUZZ_COOLDOWN_MS - Date.now() : 0;
  if (wait > 0) throw new ListingRequestError(`Please wait ${Math.ceil(wait / 1000)} seconds before buzzing again.`);
  return alertAgents(requestId, [], { everyone: true });
}

/** First partner to accept wins (atomic). */
export async function acceptListingRequest(requestId: string, agentProfileId: string) {
  const request = await prisma.listingRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new ListingRequestError("Request not found.");
  if (request.purpose === "SELL") throw new ListingRequestError("This request is handled by the admin team.");
  const escalated = request.paidAt != null && request.paidAt.getTime() < Date.now() - ESCALATE_AFTER_MS;
  if (!alertedIds(request).includes(agentProfileId) && !escalated) {
    throw new ListingRequestError("This request was not sent to you.");
  }
  const partner = await prisma.agentProfile.findUnique({ where: { id: agentProfileId }, select: { status: true, primeStatus: true } });
  if (!partner || partner.status !== "APPROVED" || !partner.primeStatus) {
    throw new ListingRequestError("Only active Prime partners can accept owner requests.");
  }

  const claim = await prisma.listingRequest.updateMany({
    where: { id: requestId, status: "SEARCHING" },
    data: { status: "ACCEPTED", acceptedByAgentId: agentProfileId, acceptedAt: new Date() },
  });
  if (claim.count === 0) throw new ListingRequestError("Another partner has already accepted this request.");

  for (const other of alertedIds(request).filter((id) => id !== agentProfileId)) {
    emitToAgent(other, "listing-request:taken", { id: requestId });
  }
  return prisma.listingRequest.findUniqueOrThrow({ where: { id: requestId } });
}

export async function markLinkSent(requestId: string, agentProfileId: string) {
  await prisma.listingRequest.updateMany({
    where: { id: requestId, acceptedByAgentId: agentProfileId, status: { in: ["ACCEPTED", "LINK_SENT"] } },
    data: { status: "LINK_SENT", linkSentAt: new Date() },
  });
}

export async function getRequestByFormToken(formToken: string) {
  return prisma.listingRequest.findUnique({
    where: { formToken },
    include: { acceptedAgent: { include: { user: { select: { name: true, phone: true } } } } },
  });
}

export type OwnerListingInput = Omit<
  CreateAgentListingInput,
  "city" | "locality" | "latitude" | "longitude" | "listingType" | "listingPlan" | "masterPropertyId"
> & { locality?: string | null };

/** The owner submits the details from the link the partner sent (rent requests only; sell requests are admin-handled). */
export async function submitOwnerListing(formToken: string, input: OwnerListingInput) {
  const request = await prisma.listingRequest.findUnique({ where: { formToken } });
  if (!request || !request.acceptedByAgentId) throw new ListingRequestError("This link is not active.");
  if (request.status === "SUBMITTED") throw new ListingRequestError("This property has already been submitted.");
  if (request.status !== "ACCEPTED" && request.status !== "LINK_SENT") throw new ListingRequestError("This link is not active.");

  const coords =
    (await geocodeLocation(`${input.exactAddress}, ${request.city}`).catch(() => null)) ??
    (request.latitude != null && request.longitude != null ? { latitude: request.latitude, longitude: request.longitude } : null);
  if (!coords) throw new ListingRequestError("We couldn't locate that address. Please check it and try again.");

  // Lock the request first so a double-submit can't create two listings.
  const lock = await prisma.listingRequest.updateMany({
    where: { id: request.id, status: { in: ["ACCEPTED", "LINK_SENT"] } },
    data: { status: "SUBMITTED" },
  });
  if (lock.count === 0) throw new ListingRequestError("This property has already been submitted.");

  try {
    const listing = await createAgentListing(request.acceptedByAgentId, {
      ...input,
      city: request.city,
      locality: input.locality?.trim() || request.locality,
      latitude: coords.latitude,
      longitude: coords.longitude,
      listingType: request.purpose === "SELL" ? "SALE" : "RENT",
      listingPlan: request.plan,
    });
    await prisma.listingRequest.update({ where: { id: request.id }, data: { agentListingId: listing.id } });

    const agent = await prisma.agentProfile.findUnique({
      where: { id: request.acceptedByAgentId },
      include: { user: { select: { id: true, phone: true, email: true } } },
    });
    if (agent) {
      await notifyUser(
        agent.user,
        `${request.ownerName} submitted the property details. "${listing.title}" is now live under your ID.`,
        "Owner listing created",
      ).catch(() => {});
    }
    return listing;
  } catch (error) {
    await prisma.listingRequest.update({ where: { id: request.id }, data: { status: "LINK_SENT" } });
    throw error;
  }
}

/** Admin: hand a request to a specific partner (or re-open the search). */
export async function adminAssignRequest(requestId: string, agentProfileId: string | null) {
  const request = await prisma.listingRequest.findUniqueOrThrow({ where: { id: requestId } });
  if (request.status === "SUBMITTED" || request.status === "CANCELLED" || request.status === "PENDING_PAYMENT") {
    throw new ListingRequestError("This request can't be reassigned.");
  }
  // A sell request stays with the admin team: never hand it to a partner or open a search.
  if (request.purpose === "SELL") {
    throw new ListingRequestError("Sell requests are handled by the admin team only.");
  }
  if (agentProfileId) {
    await prisma.listingRequest.update({
      where: { id: requestId },
      data: { status: "ACCEPTED", acceptedByAgentId: agentProfileId, acceptedAt: new Date(), alertedAgentIds: [...new Set([...alertedIds(request), agentProfileId])].join(",") },
    });
    const agent = await prisma.agentProfile.findUnique({ where: { id: agentProfileId }, include: { user: { select: { id: true, phone: true, email: true } } } });
    if (agent) {
      const text = `Admin assigned you an owner listing request: ${request.ownerName} (${request.ownerPhone}) in ${request.city}. Call them and send the details link.`;
      emitToAgent(agentProfileId, "listing-request:new", { id: request.id, city: request.city });
      await sendPushToUser(agent.user.id, { title: "Owner request assigned", body: text }, { type: "listing-request", requestId }).catch(() => {});
      await notifyUser(agent.user, text, "Owner request assigned").catch(() => {});
    }
  } else {
    await prisma.listingRequest.update({ where: { id: requestId }, data: { status: "SEARCHING", acceptedByAgentId: null, acceptedAt: null, linkSentAt: null } });
    await alertAgents(requestId);
  }
}

export async function cancelRequest(requestId: string, note?: string) {
  await prisma.listingRequest.update({ where: { id: requestId }, data: { status: "CANCELLED", adminNote: note ?? null } });
}

/** Admin: a sell request has been dealt with (listing created or owner served). */
export async function adminCompleteRequest(requestId: string, note?: string) {
  const done = await prisma.listingRequest.updateMany({
    where: { id: requestId, status: "ADMIN_DESK" },
    data: { status: "SUBMITTED", adminNote: note ?? null },
  });
  if (done.count === 0) throw new ListingRequestError("This request is not on the sell desk.");
}
