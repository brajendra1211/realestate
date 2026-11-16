"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  createListingRequest,
  createRequestPaymentOrder,
  confirmRequestPaymentRazorpay,
  confirmRequestPaymentSimulated,
  rebuzzRequest,
  ListingRequestError,
} from "@/lib/listingRequest";

export type RequestFormInput = {
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  city: string;
  locality?: string;
  plan: "BASIC" | "GOLD";
  referredByAgentCode?: string;
};

function friendly(error: unknown): never {
  if (error instanceof ListingRequestError) throw new Error(error.message);
  throw error;
}

/** Step 1: save the owner's request, then either open Razorpay or fall back to the test-mode pay button. */
export async function startListingRequestAction(form: RequestFormInput) {
  const session = await auth();
  const userId = session && (session.user.role === "OWNER" || session.user.role === "DEALER") ? session.user.id : null;
  try {
    const request = await createListingRequest({ ...form, userId });
    const { order, keyId } = await createRequestPaymentOrder(request.id);
    const base = { requestId: request.id, statusToken: request.statusToken, amount: request.amount };
    if (!order || !keyId) return { simulated: true as const, ...base };
    return { simulated: false as const, ...base, order, keyId };
  } catch (error) {
    friendly(error);
  }
}

async function assertToken(requestId: string, statusToken: string) {
  const r = await prisma.listingRequest.findUnique({ where: { id: requestId }, select: { statusToken: true } });
  if (!r || r.statusToken !== statusToken) throw new Error("Request not found.");
}

export async function confirmSimulatedPaymentAction(requestId: string, statusToken: string) {
  await assertToken(requestId, statusToken);
  try {
    await confirmRequestPaymentSimulated(requestId);
    return { ok: true as const };
  } catch (error) {
    friendly(error);
  }
}

export async function verifyRequestPaymentAction(
  requestId: string,
  statusToken: string,
  orderId: string,
  paymentId: string,
  signature: string,
) {
  await assertToken(requestId, statusToken);
  try {
    await confirmRequestPaymentRazorpay(requestId, orderId, paymentId, signature);
    return { ok: true as const };
  } catch (error) {
    friendly(error);
  }
}

/** The owner buzzes the partners again (no extra payment) while nobody has accepted. */
export async function rebuzzAction(requestId: string, statusToken: string) {
  await assertToken(requestId, statusToken);
  try {
    const reached = await rebuzzRequest(requestId);
    return { ok: true as const, reached };
  } catch (error) {
    friendly(error);
  }
}
