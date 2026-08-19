import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";
import { findNearbyAgents } from "@/lib/agentGeo";
import { findAssignedAgentsForLocation } from "@/lib/areaRouting";
import { emitToAgent, emitToDispatch } from "@/lib/socket";
import {
  scheduleBatchTimeout,
  cancelPendingBatchTimeout,
  isDispatchQueueConfigured,
} from "@/lib/queues/dispatchQueue";
import { createRazorpayOrder, isRazorpayConfigured, verifyRazorpayPaymentSignature } from "@/lib/razorpay";
import { computeSplit } from "@/lib/commission";
import { getSiteSettings } from "@/lib/site-settings";

export class DispatchServiceError extends Error {}

const BATCH_SIZE = 8; // "5-10 nearest Prime agents" — §3.5
// Cascading radius ladder — §3.5 says "radius scan (1-5 km)" and "Batch 2:
// next 5-10 agents", read together as widening the search each time a batch
// times out rather than just re-querying the same 1-5km window.
const RADIUS_LADDER_KM = [1, 3, 5];

export type CreateDispatchInput = {
  buyerId: string;
  latitude: number;
  longitude: number;
};

// The dispatch trigger reuses the exact ₹100 unlock-pass payment/split —
// docs/platform-requirements.md §3.17's monetization table has only one
// "₹100 unlock pass" revenue line, not a second one for dispatch, so this
// mirrors src/lib/unlock.ts's createUnlockOrder/verifyAndUnlockListing shape
// rather than inventing a separate charge.
export async function createDispatchOrder(input: CreateDispatchInput) {
  if (!isDispatchQueueConfigured()) {
    throw new DispatchServiceError("dispatchNotConfigured");
  }
  if (!isRazorpayConfigured()) return { order: null, keyId: null };

  const settings = await getSiteSettings();
  const order = await createRazorpayOrder(settings.unlockPassAmount, `dispatch_${input.buyerId}_${Date.now()}`);
  return { order, keyId: order ? process.env.RAZORPAY_KEY_ID ?? null : null };
}

export async function startDispatchSimulated(input: CreateDispatchInput) {
  return createDispatchRecordAndCascade(input, null);
}

export async function verifyAndStartDispatch(
  input: CreateDispatchInput,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
) {
  const valid = verifyRazorpayPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
  if (!valid) throw new DispatchServiceError("invalidSignature");
  return createDispatchRecordAndCascade(input, razorpayOrderId);
}

async function createDispatchRecordAndCascade(
  input: CreateDispatchInput,
  razorpayOrderId: string | null,
  overrides?: { amount: number; agentSplit: number; companySplit: number; excludeAgentIds?: string[] }
) {
  let amount = overrides?.amount;
  let agentSplit = overrides?.agentSplit;
  let companySplit = overrides?.companySplit;
  if (amount === undefined || agentSplit === undefined || companySplit === undefined) {
    const settings = await getSiteSettings();
    const split = computeSplit(settings.unlockPassAmount, settings.unlockAgentSplitPercent);
    amount = settings.unlockPassAmount;
    agentSplit = split.agentSplit;
    companySplit = split.companySplit;
  }

  const dispatch = await prisma.dispatchRequest.create({
    data: {
      buyerId: input.buyerId,
      latitude: input.latitude,
      longitude: input.longitude,
      amount,
      agentSplit,
      companySplit,
      razorpayOrderId,
      currentRadiusKm: RADIUS_LADDER_KM[0],
      currentBatch: 1,
    },
  });

  await dispatchBatch(
    dispatch.id,
    input.latitude,
    input.longitude,
    1,
    RADIUS_LADDER_KM[0],
    overrides?.excludeAgentIds ?? []
  );
  return dispatch;
}

// §3.7's no-show escalation: "customer can escalate to customer care, who
// broadcasts to 5-10 new nearby agents using the customer's existing unique
// booking code." Reuses the exact same cascade engine as a paid dispatch
// (findNearbyAgents, batch/radius widening, Socket.io push, BullMQ
// timeout) — the only difference is amount: 0 (no new ₹100 charge; the
// customer already paid for the original engagement) and the no-show
// agent is excluded from ever being re-matched to this escalation.
export async function createFreeDispatchForEscalation(
  buyerId: string,
  latitude: number,
  longitude: number,
  excludeAgentId: string
) {
  return createDispatchRecordAndCascade(
    { buyerId, latitude, longitude },
    null,
    { amount: 0, agentSplit: 0, companySplit: 0, excludeAgentIds: [excludeAgentId] }
  );
}

// Notifies the next 5-10 nearest not-yet-notified Prime agents, pushes a
// live update to the customer's radar screen, and arms the 1-minute
// batch-timeout job — §3.5's "radar-style live UI" + cascade mechanics.
async function dispatchBatch(
  dispatchRequestId: string,
  latitude: number,
  longitude: number,
  batch: number,
  radiusKm: number,
  extraExcludeAgentIds: string[] = []
) {
  const alreadyNotified = await prisma.dispatchNotification.findMany({
    where: { dispatchRequestId },
    select: { agentId: true },
  });
  const excludeAgentIds = [...alreadyNotified.map((n) => n.agentId), ...extraExcludeAgentIds];

  // Pincode-based admin override takes priority over the default radius
  // search — "call random na jaakar sirf aur sirf unhi chuninda area agents
  // ko jayegi" (client's Agent Registration doc). Once those assigned
  // agents have all been notified (and are therefore in excludeAgentIds on
  // a later batch), this naturally returns empty and falls through to the
  // normal radius cascade — no special-casing by batch number needed.
  const assigned = await findAssignedAgentsForLocation(latitude, longitude, excludeAgentIds);
  const nearby =
    assigned.length > 0
      ? assigned.slice(0, BATCH_SIZE)
      : await findNearbyAgents(latitude, longitude, radiusKm, BATCH_SIZE, excludeAgentIds);

  if (nearby.length === 0) {
    // Nobody at this rung — widen immediately and try again rather than
    // persisting this batch and waiting out a full minute for an empty
    // radius. The "1-minute accept timer" (§3.5) only starts once agents
    // are actually notified, below.
    const nextRungIndex = RADIUS_LADDER_KM.indexOf(radiusKm) + 1;
    if (nextRungIndex < RADIUS_LADDER_KM.length) {
      return dispatchBatch(
        dispatchRequestId,
        latitude,
        longitude,
        batch + 1,
        RADIUS_LADDER_KM[nextRungIndex],
        extraExcludeAgentIds
      );
    }
    await expireDispatch(dispatchRequestId);
    return { notifiedCount: 0 };
  }

  await prisma.$transaction([
    prisma.dispatchNotification.createMany({
      data: nearby.map((a) => ({ dispatchRequestId, agentId: a.agentProfileId, batch })),
    }),
    prisma.dispatchRequest.update({
      where: { id: dispatchRequestId },
      data: { currentBatch: batch, currentRadiusKm: radiusKm, batchStartedAt: new Date() },
    }),
  ]);

  for (const agent of nearby) {
    emitToAgent(agent.agentProfileId, "dispatch:new", {
      dispatchRequestId,
      latitude,
      longitude,
      distanceKm: Math.round(agent.distanceKm * 10) / 10,
      batch,
    });
  }
  emitToDispatch(dispatchRequestId, "dispatch:batch", {
    batch,
    radiusKm,
    agentsNotified: nearby.length,
  });

  await scheduleBatchTimeout(dispatchRequestId, batch);
  return { notifiedCount: nearby.length };
}

// BullMQ worker entry point (src/lib/queues/dispatchQueue.ts) — fires ~60s
// after a batch was notified. No-ops if the dispatch already resolved
// (matched/expired/cancelled) or a newer batch has already superseded this
// job (defends against a stale/duplicate timer).
export async function advanceDispatchBatch(dispatchRequestId: string, batch: number) {
  const dispatch = await prisma.dispatchRequest.findUnique({ where: { id: dispatchRequestId } });
  if (!dispatch) return;
  if (dispatch.status !== "SEARCHING") return;
  if (dispatch.currentBatch !== batch) return;

  const nextBatch = batch + 1;
  const nextRungIndex = Math.min(
    RADIUS_LADDER_KM.indexOf(dispatch.currentRadiusKm) + 1,
    RADIUS_LADDER_KM.length - 1
  );

  await dispatchBatch(
    dispatchRequestId,
    dispatch.latitude,
    dispatch.longitude,
    nextBatch,
    RADIUS_LADDER_KM[nextRungIndex]
  );
}

async function expireDispatch(dispatchRequestId: string) {
  const dispatch = await prisma.dispatchRequest.update({
    where: { id: dispatchRequestId },
    data: { status: "EXPIRED" },
    include: { buyer: { select: { phone: true, email: true, name: true } } },
  });
  emitToDispatch(dispatchRequestId, "dispatch:expired", {});
  await notifyUser(
    dispatch.buyer,
    "No nearby agents were available right now. Please try again shortly.",
    "No agents found"
  );
}

// First agent to accept wins — §3.5's core fairness rule. The status-guarded
// updateMany is the atomic claim: if two agents hit Accept within the same
// instant, only the first `UPDATE ... WHERE status = 'SEARCHING'` actually
// matches a row, so a race can't double-book the lead.
export async function acceptDispatch(dispatchRequestId: string, agentProfileId: string) {
  const notified = await prisma.dispatchNotification.findUnique({
    where: { dispatchRequestId_agentId: { dispatchRequestId, agentId: agentProfileId } },
  });
  if (!notified) throw new DispatchServiceError("notNotified");

  // §3.1: an agent demoted after a failed Prime renewal can't accept leads
  // they were notified about before losing Prime — the batch simply times
  // out and cascades to the next agent, same as if they'd never responded.
  const agent = await prisma.agentProfile.findUnique({ where: { id: agentProfileId } });
  if (!agent?.primeStatus) throw new DispatchServiceError("notPrime");

  const claim = await prisma.dispatchRequest.updateMany({
    where: { id: dispatchRequestId, status: "SEARCHING" },
    data: { status: "MATCHED", acceptedByAgentId: agentProfileId, acceptedAt: new Date() },
  });
  if (claim.count === 0) throw new DispatchServiceError("alreadyMatched");

  const dispatch = await prisma.dispatchRequest.findUniqueOrThrow({
    where: { id: dispatchRequestId },
    include: {
      buyer: { select: { phone: true, email: true, name: true } },
      acceptedAgent: { include: { user: { select: { phone: true, email: true } } } },
    },
  });

  // Free no-show-escalation dispatches (§3.7, agentSplit: 0 — see
  // createFreeDispatchForEscalation) don't credit anything: there's no new
  // ₹100 charge behind them, just a re-match of an engagement the customer
  // already paid for once.
  if (dispatch.agentSplit > 0) {
    await prisma.$transaction([
      prisma.commissionLedgerEntry.create({
        data: {
          agentId: agentProfileId,
          // Same revenue line as the ₹100 listing unlock (§3.17 has one
          // "customer unlock pass" line, not a separate dispatch fee).
          type: "UNLOCK_SPLIT",
          amount: dispatch.agentSplit,
          refId: dispatchRequestId,
          note: `50% of ₹${dispatch.amount} dispatch match`,
        },
      }),
      prisma.agentProfile.update({
        where: { id: agentProfileId },
        data: { walletBalance: { increment: dispatch.agentSplit } },
      }),
    ]);
  }

  await cancelPendingBatchTimeout(dispatchRequestId, dispatch.currentBatch);

  const otherAgentIds = (
    await prisma.dispatchNotification.findMany({
      where: { dispatchRequestId, agentId: { not: agentProfileId } },
      select: { agentId: true },
    })
  ).map((n) => n.agentId);
  for (const otherAgentId of otherAgentIds) {
    emitToAgent(otherAgentId, "dispatch:cancelled", { dispatchRequestId });
  }

  emitToDispatch(dispatchRequestId, "dispatch:matched", {
    agentCode: dispatch.acceptedAgent!.agentCode,
    shopName: dispatch.acceptedAgent!.shopName,
    shopDistance:
      Math.round(
        haversineIfPossible(dispatch.latitude, dispatch.longitude, dispatch.acceptedAgent) * 10
      ) / 10,
  });

  await notifyUser(
    dispatch.buyer,
    `Agent ${dispatch.acceptedAgent!.agentCode} accepted your request. Check your dispatch status for their contact details.`,
    "Agent matched"
  );
  await notifyUser(
    dispatch.acceptedAgent!.user,
    dispatch.agentSplit > 0
      ? `You accepted a new customer lead. ₹${dispatch.agentSplit} has been credited to your wallet — check your dashboard for their number.`
      : `You accepted a re-matched customer lead — check your dashboard for their number.`,
    "Lead accepted"
  );

  return dispatch;
}

function haversineIfPossible(
  lat: number,
  lng: number,
  agent: { shopLatitude: number | null; shopLongitude: number | null } | null
) {
  if (!agent?.shopLatitude || !agent.shopLongitude) return 0;
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(agent.shopLatitude - lat);
  const dLon = toRad(agent.shopLongitude - lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(toRad(lat)) * Math.cos(toRad(agent.shopLatitude));
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function cancelDispatch(dispatchRequestId: string, buyerId: string) {
  const result = await prisma.dispatchRequest.updateMany({
    where: { id: dispatchRequestId, buyerId, status: "SEARCHING" },
    data: { status: "CANCELLED" },
  });
  if (result.count === 0) throw new DispatchServiceError("cannotCancel");
  emitToDispatch(dispatchRequestId, "dispatch:cancelled", {});
}

export async function getDispatchStatus(dispatchRequestId: string) {
  return prisma.dispatchRequest.findUnique({
    where: { id: dispatchRequestId },
    include: {
      acceptedAgent: { select: { agentCode: true, shopName: true, user: { select: { phone: true } } } },
    },
  });
}

// Agent dashboard's initial load (Socket.io covers live pushes after that) —
// every SEARCHING dispatch this agent is still an active candidate for.
export async function getActiveDispatchesForAgent(agentProfileId: string) {
  const notifications = await prisma.dispatchNotification.findMany({
    where: { agentId: agentProfileId, dispatchRequest: { status: "SEARCHING" } },
    include: { dispatchRequest: true },
    orderBy: { createdAt: "desc" },
  });
  return notifications.map((n) => n.dispatchRequest);
}

export async function getDispatchWithBuyerContact(dispatchRequestId: string, agentProfileId: string) {
  const dispatch = await prisma.dispatchRequest.findUnique({
    where: { id: dispatchRequestId },
    include: { buyer: { select: { name: true, phone: true, email: true } } },
  });
  if (!dispatch || dispatch.acceptedByAgentId !== agentProfileId) {
    throw new DispatchServiceError("notFound");
  }
  return dispatch;
}
