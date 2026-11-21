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
import { requestOtp, verifyOtp, normalizeIdentifier } from "@/lib/otp";
import { createRazorpayOrder, isRazorpayConfigured, verifyPaidOrder } from "@/lib/razorpay";
import type { ListingPlanTier, ListingRequest, ListingRequestStatus } from "@/generated/prisma";

/**
 * Assisted owner listing:
 *   RENT: owner registers (WhatsApp OTP) and pays for a plan -> owner fills the property
 *   details with location ON -> partners within 5 km get a buzzer (then 10, then 15 km) ->
 *   the first to accept visits the property and verifies it with the owner's OTP -> only then
 *   the listing goes live under that partner's ID and the 50% plan-fee share reaches their
 *   wallet. Nobody verified within 48 hours -> the request is released to other partners.
 *   SELL: same plans and prices, but the request goes ONLY to the admin team (status
 *   ADMIN_DESK). No partner is ever alerted, can see it or accept it.
 */
export class ListingRequestError extends Error {}

export const REQUEST_STATUS_LABEL: Record<ListingRequestStatus, string> = {
  PENDING_PAYMENT: "Payment pending",
  DETAILS_PENDING: "Add your property details",
  SEARCHING: "Finding a partner",
  ACCEPTED: "Partner will verify",
  LINK_SENT: "Details link sent",
  SUBMITTED: "Listing created",
  CANCELLED: "Cancelled",
  ADMIN_DESK: "With our team",
};

const token = () => randomBytes(18).toString("base64url");

// Buzzer widens 5 km -> 10 km -> 15 km, one step every STAGE_GAP_MS while nobody accepts.
export const BUZZ_STAGES_KM = [5, 10, 15] as const;
export const STAGE_GAP_MS = 2 * 60 * 1000;
// A partner must verify on site within this long, otherwise the request is re-opened to other partners.
export const VERIFY_WITHIN_MS = 48 * 60 * 60 * 1000;

/** Prisma filter: SEARCHING requests this partner may see and accept right now (only partners inside the current radius were alerted). */
export function visibleToAgentWhere(agentProfileId: string) {
  return {
    status: "SEARCHING" as const,
    purpose: "RENT" as const, // sell requests never reach a partner
    alertedAgentIds: { contains: agentProfileId },
  };
}

export const formLink = (r: Pick<ListingRequest, "formToken">) => absoluteUrl(`/list/${r.formToken}`);
export const statusLink = (r: Pick<ListingRequest, "id" | "statusToken">) =>
  absoluteUrl(`/list-property/request/${r.id}?k=${r.statusToken}`);

const idList = (v: string | null | undefined) => (v ?? "").split(",").filter(Boolean);
function alertedIds(r: Pick<ListingRequest, "alertedAgentIds">) {
  return idList(r.alertedAgentIds);
}

/** The same identifier format is used to send and to check an owner's OTP. */
export const otpIdentifierFor = (phone: string) => normalizeIdentifier(phone.replace(/[^\d]/g, "").slice(-10));

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
    // Rent requests wait for the owner to add the property details; the buzzer rings after that.
    data: { status: sell ? "ADMIN_DESK" : "DETAILS_PENDING", paidAt: new Date() },
  });
  const request = await prisma.listingRequest.findUniqueOrThrow({ where: { id: requestId } });
  if (claim.count === 1) {
    if (sell) await notifyAdminsOfSellRequest(request);
  }
  return request;
}

async function notifyAdminsOfSellRequest(request: Pick<ListingRequest, "ownerName" | "ownerPhone" | "city" | "locality">) {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { phone: true, email: true }, take: 5 });
  const where = [request.locality, request.city].filter(Boolean).join(", ");
  const text = `New SELL request from ${request.ownerName} (${request.ownerPhone}) in ${where}. Open Admin > Owner requests > Sell desk.`;
  await Promise.all(admins.map((a) => notifyUser(a, text, "New sell request").catch(() => {})));
}

/**
 * Buzzer: every Prime partner within `radiusKm` of the property (partners who timed out earlier are skipped).
 * There is no "ring everyone" fallback: with nobody inside 15 km the request stays visible to the admin team.
 */
export async function alertAgents(requestId: string, opts: { radiusKm?: number } = {}) {
  const request = await prisma.listingRequest.findUniqueOrThrow({ where: { id: requestId } });
  if (request.status !== "SEARCHING" || request.purpose === "SELL") return 0;

  const radiusKm = opts.radiusKm ?? (request.buzzRadiusKm || BUZZ_STAGES_KM[0]);
  const skipped = idList(request.skippedAgentIds);
  let ids: string[] = [];
  if (request.latitude != null && request.longitude != null) {
    const near = await findNearbyAgents(request.latitude, request.longitude, radiusKm, 50, skipped);
    ids = near.map((n) => n.agentProfileId);
  }
  const before = alertedIds(request);
  const fresh = ids.filter((id) => !before.includes(id));
  const all = [...new Set([...before, ...ids])];
  await prisma.listingRequest.update({
    where: { id: request.id },
    data: {
      alertedAgentIds: all.join(","),
      buzzRadiusKm: radiusKm,
      searchStartedAt: request.searchStartedAt ?? new Date(),
      buzzCount: { increment: 1 },
      lastBuzzAt: new Date(),
    },
  });

  const agents = await prisma.agentProfile.findMany({
    where: { id: { in: all }, status: "APPROVED", buzzerAlerts: true },
    include: { user: { select: { id: true, phone: true, email: true } } },
  });
  const where = [request.locality, request.city].filter(Boolean).join(", ");
  const text = `New owner in ${where} (within ${radiusKm} km) needs their property verified. Open Owner Requests in your partner panel and accept it first.`;
  // Partners already alerted at a smaller radius see the card already; on a manual re-buzz everyone in range is pushed again.
  const manual = opts.radiusKm == null;
  await Promise.all(
    agents
      .filter((a) => manual || fresh.includes(a.id))
      .map(async (a) => {
        emitToAgent(a.id, "listing-request:new", { id: request.id, city: request.city, locality: request.locality });
        await sendPushToUser(a.user.id, { title: "New owner listing request", body: text }, { type: "listing-request", requestId: request.id }).catch(() => {});
        await notifyUser(a.user, text, "New owner listing request").catch(() => {});
      }),
  );
  return agents.length;
}

/** (Re)start the 5 -> 10 -> 15 km cycle from scratch, optionally skipping the partner who did not verify in time. */
export async function restartSearch(requestId: string, skipAgentId?: string | null) {
  const request = await prisma.listingRequest.findUniqueOrThrow({ where: { id: requestId } });
  const skipped = [...new Set([...idList(request.skippedAgentIds), ...(skipAgentId ? [skipAgentId] : [])])];
  await prisma.listingRequest.update({
    where: { id: requestId },
    data: {
      status: "SEARCHING",
      acceptedByAgentId: null,
      acceptedAt: null,
      linkSentAt: null,
      alertedAgentIds: null,
      skippedAgentIds: skipped.join(",") || null,
      buzzRadiusKm: 0,
      searchStartedAt: new Date(),
    },
  });
  return alertAgents(requestId, { radiusKm: BUZZ_STAGES_KM[0] });
}

/**
 * Runs the timers (called by the cron route and whenever the admin / owner pages refresh):
 *  - SEARCHING and nobody accepted: widen the radius every STAGE_GAP_MS (5 -> 10 -> 15 km)
 *  - SEARCHING for 48 h, or ACCEPTED but not verified within 48 h: automatic re-buzz to other partners
 */
export async function advanceListingRequests() {
  const now = Date.now();
  const rows = await prisma.listingRequest.findMany({
    where: { purpose: "RENT", status: { in: ["SEARCHING", "ACCEPTED"] }, detailsJson: { not: null } },
  });
  let changed = 0;
  for (const r of rows) {
    if (r.status === "ACCEPTED") {
      if (r.acceptedAt && now - r.acceptedAt.getTime() >= VERIFY_WITHIN_MS) {
        await restartSearch(r.id, r.acceptedByAgentId);
        changed++;
      }
      continue;
    }
    if (r.searchStartedAt && now - r.searchStartedAt.getTime() >= VERIFY_WITHIN_MS) {
      await restartSearch(r.id);
      changed++;
      continue;
    }
    const stage = BUZZ_STAGES_KM.findIndex((km) => km === r.buzzRadiusKm);
    const last = r.lastBuzzAt?.getTime() ?? 0;
    if (stage >= 0 && stage < BUZZ_STAGES_KM.length - 1 && now - last >= STAGE_GAP_MS) {
      await alertAgents(r.id, { radiusKm: BUZZ_STAGES_KM[stage + 1] });
      changed++;
    }
  }
  return changed;
}

export const REBUZZ_COOLDOWN_MS = 60 * 1000;

/** The owner rings again (no new payment) while nobody has accepted: partners already in range are alerted once more. */
export async function rebuzzRequest(requestId: string) {
  const request = await prisma.listingRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new ListingRequestError("Request not found.");
  if (request.status !== "SEARCHING") throw new ListingRequestError("A partner has already picked up this request.");
  const wait = request.lastBuzzAt ? request.lastBuzzAt.getTime() + REBUZZ_COOLDOWN_MS - Date.now() : 0;
  if (wait > 0) throw new ListingRequestError(`Please wait ${Math.ceil(wait / 1000)} seconds before buzzing again.`);
  return alertAgents(requestId);
}

/** First partner to accept wins (atomic). */
export async function acceptListingRequest(requestId: string, agentProfileId: string) {
  const request = await prisma.listingRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new ListingRequestError("Request not found.");
  if (request.purpose === "SELL") throw new ListingRequestError("This request is handled by the admin team.");
  if (!alertedIds(request).includes(agentProfileId)) {
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

  // Once accepted the request disappears from every other partner's screen.
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
> & { locality?: string | null; latitude: number; longitude: number };

/**
 * The owner submits the property details (rent requests only; sell requests are admin-handled).
 * The listing is NOT created yet: the details are stored on the request and the buzzer rings
 * partners within 5 km. The listing goes live only after a partner verifies on site (verifyAndPublish).
 */
export async function submitOwnerListing(formToken: string, input: OwnerListingInput) {
  const request = await prisma.listingRequest.findUnique({ where: { formToken } });
  if (!request || request.purpose === "SELL") throw new ListingRequestError("This link is not active.");
  if (request.status === "SUBMITTED" || (request.detailsJson && request.status !== "DETAILS_PENDING")) {
    throw new ListingRequestError("Your property details have already been submitted.");
  }
  if (request.status !== "DETAILS_PENDING" && request.status !== "ACCEPTED" && request.status !== "LINK_SENT") {
    throw new ListingRequestError("This link is not active.");
  }

  if (!input.title.trim() || !input.description.trim() || !input.exactAddress.trim() || !(input.price > 0)) {
    throw new ListingRequestError("Please check the details you entered (title, description, address and rent are required).");
  }
  if (input.images.length === 0) throw new ListingRequestError("Please add at least one photo of the property.");
  if (!Number.isFinite(input.latitude) || !Number.isFinite(input.longitude)) {
    throw new ListingRequestError("Please turn on your location so we can find a partner near your property.");
  }

  const legacyAccepted = request.acceptedByAgentId != null; // partner was assigned before the owner filled the form
  const claim = await prisma.listingRequest.updateMany({
    where: { id: request.id, status: request.status, detailsJson: null },
    data: {
      detailsJson: JSON.stringify(input),
      detailsAt: new Date(),
      latitude: input.latitude,
      longitude: input.longitude,
      locality: input.locality?.trim() || request.locality,
      status: legacyAccepted ? "ACCEPTED" : "SEARCHING",
      searchStartedAt: legacyAccepted ? null : new Date(),
      acceptedAt: legacyAccepted ? new Date() : null,
    },
  });
  if (claim.count === 0) throw new ListingRequestError("Your property details have already been submitted.");

  if (!legacyAccepted) await alertAgents(request.id, { radiusKm: BUZZ_STAGES_KM[0] });
  else if (request.acceptedByAgentId) {
    const agent = await prisma.agentProfile.findUnique({
      where: { id: request.acceptedByAgentId },
      include: { user: { select: { id: true, phone: true, email: true } } },
    });
    if (agent) {
      await notifyUser(agent.user, `${request.ownerName} submitted the property details. Visit and verify it with their OTP.`, "Owner details ready").catch(() => {});
    }
  }
  return { id: request.id, statusToken: request.statusToken };
}

export function parseOwnerDetails(r: Pick<ListingRequest, "detailsJson">): OwnerListingInput | null {
  if (!r.detailsJson) return null;
  try {
    return JSON.parse(r.detailsJson) as OwnerListingInput;
  } catch {
    return null;
  }
}

async function requireVerifiable(requestId: string, agentProfileId: string) {
  const request = await prisma.listingRequest.findUnique({ where: { id: requestId } });
  if (!request || request.acceptedByAgentId !== agentProfileId) throw new ListingRequestError("This request is not assigned to you.");
  if (request.status !== "ACCEPTED") throw new ListingRequestError("This request is not waiting for verification.");
  if (!parseOwnerDetails(request)) throw new ListingRequestError("The owner has not submitted the property details yet.");
  return request;
}

/** Step 1 of verification: the partner is at the property and asks for the owner's OTP (sent to the owner's WhatsApp). */
export async function sendVerifyOtp(requestId: string, agentProfileId: string) {
  const request = await requireVerifiable(requestId, agentProfileId);
  const result = await requestOtp(otpIdentifierFor(request.ownerPhone));
  if (!result.sent) throw new ListingRequestError("We couldn't send the OTP to the owner. Please try again in a minute.");
  return { channel: result.channel };
}

/**
 * Step 2: the owner reads out the OTP. Only now does the listing go live under the partner's ID
 * and the plan-fee share (createAgentListing) reach the partner's wallet.
 */
export async function verifyAndPublish(requestId: string, agentProfileId: string, code: string) {
  const request = await requireVerifiable(requestId, agentProfileId);
  const details = parseOwnerDetails(request)!;
  if (!(await verifyOtp(otpIdentifierFor(request.ownerPhone), code.trim()))) {
    throw new ListingRequestError("That OTP is not correct or has expired.");
  }

  // Lock first so a double-tap can't create two listings (or pay the partner twice).
  const lock = await prisma.listingRequest.updateMany({
    where: { id: request.id, status: "ACCEPTED", acceptedByAgentId: agentProfileId },
    data: { status: "SUBMITTED" },
  });
  if (lock.count === 0) throw new ListingRequestError("This request has already been completed.");

  try {
    const listing = await createAgentListing(agentProfileId, {
      ...details,
      city: request.city,
      locality: details.locality?.trim() || request.locality,
      listingType: "RENT",
      listingPlan: request.plan,
    });
    await prisma.listingRequest.update({ where: { id: request.id }, data: { agentListingId: listing.id } });
    if (request.userId) {
      const owner = await prisma.user.findUnique({ where: { id: request.userId }, select: { id: true, phone: true, email: true } });
      if (owner) await notifyUser(owner, `Your property "${listing.title}" has been verified and is now live.`, "Your listing is live").catch(() => {});
    }
    return listing;
  } catch (error) {
    await prisma.listingRequest.update({ where: { id: request.id }, data: { status: "ACCEPTED" } });
    throw error;
  }
}

/** Admin: hand a request to a specific partner (or re-open the search). */
export async function adminAssignRequest(requestId: string, agentProfileId: string | null) {
  const request = await prisma.listingRequest.findUniqueOrThrow({ where: { id: requestId } });
  if (request.status === "SUBMITTED" || request.status === "CANCELLED" || request.status === "PENDING_PAYMENT" || request.status === "DETAILS_PENDING") {
    throw new ListingRequestError("This request can't be reassigned yet (the owner has to submit the property details first).");
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
      const text = `Admin assigned you an owner listing request: ${request.ownerName} (${request.ownerPhone}) in ${request.city}. Visit the property, check the details and photos, and verify with the owner's OTP.`;
      emitToAgent(agentProfileId, "listing-request:new", { id: request.id, city: request.city });
      await sendPushToUser(agent.user.id, { title: "Owner request assigned", body: text }, { type: "listing-request", requestId }).catch(() => {});
      await notifyUser(agent.user, text, "Owner request assigned").catch(() => {});
    }
  } else {
    await restartSearch(requestId, request.acceptedByAgentId);
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
