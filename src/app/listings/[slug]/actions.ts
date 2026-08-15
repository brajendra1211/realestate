"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { unlockAgentListing, createUnlockOrder, verifyAndUnlockListing } from "@/lib/unlock";
import { getRazorpayKeyId } from "@/lib/razorpay";

export async function unlockListing(formData: FormData) {
  const agentListingId = String(formData.get("agentListingId") ?? "");
  const slug = String(formData.get("slug") ?? "");

  const session = await auth();
  if (!session || session.user.role !== "BUYER") {
    redirect(`/buyer/login?next=${encodeURIComponent(`/listings/${slug}`)}`);
  }

  await unlockAgentListing(session.user.id, agentListingId);
  redirect(`/listings/${slug}?unlocked=1`);
}

// Called from the client-side UnlockButton when Razorpay is configured —
// creates a real order for Checkout to open against. Returns null (rather
// than redirecting) so the client can decide what to do: open Checkout, or
// discover the listing is already unlocked and just refresh.
export async function createUnlockOrderAction(agentListingId: string, slug: string) {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") {
    redirect(`/buyer/login?next=${encodeURIComponent(`/listings/${slug}`)}`);
  }

  const result = await createUnlockOrder(session.user.id, agentListingId);
  if (result.alreadyUnlocked) return { alreadyUnlocked: true as const };
  if (!result.order) return { alreadyUnlocked: false as const, order: null, keyId: null };

  return { alreadyUnlocked: false as const, order: result.order, keyId: getRazorpayKeyId() };
}

// Called from the client after Razorpay Checkout reports success — verifies
// the signature server-side before crediting anything.
export async function verifyUnlockPaymentAction(input: {
  agentListingId: string;
  slug: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) {
  const session = await auth();
  if (!session || session.user.role !== "BUYER") {
    redirect(`/buyer/login?next=${encodeURIComponent(`/listings/${input.slug}`)}`);
  }

  await verifyAndUnlockListing(
    session.user.id,
    input.agentListingId,
    input.razorpayOrderId,
    input.razorpayPaymentId,
    input.razorpaySignature
  );
  redirect(`/listings/${input.slug}?unlocked=1`);
}
