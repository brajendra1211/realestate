"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { markLinkSent, sendVerifyOtp, verifyAndPublish, ListingRequestError } from "@/lib/listingRequest";
import { ListingServiceError } from "@/lib/listing";

async function requireAgent() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") redirect("/login");
  const agent = await prisma.agentProfile.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  if (!agent) redirect("/login");
  return agent;
}

/** Called when the partner shares the link (WhatsApp / copy) so the owner's status moves to "link sent". */
export async function markLinkSentAction(requestId: string) {
  const agent = await requireAgent();
  await markLinkSent(requestId, agent.id);
  revalidatePath("/agent/owner-requests");
}

function message(error: unknown): never {
  if (error instanceof ListingRequestError || error instanceof ListingServiceError) throw new Error(error.message);
  throw error;
}

/** The partner is at the property: send the OTP to the owner's WhatsApp. */
export async function sendVerifyOtpAction(requestId: string) {
  const agent = await requireAgent();
  try {
    await sendVerifyOtp(requestId, agent.id);
    return { ok: true as const };
  } catch (error) {
    message(error);
  }
}

/** The owner reads out the OTP: the listing goes live and the 50% share is credited. */
export async function verifyAndPublishAction(requestId: string, code: string) {
  const agent = await requireAgent();
  try {
    const listing = await verifyAndPublish(requestId, agent.id, code);
    revalidatePath("/agent/owner-requests");
    revalidatePath("/agent/listings");
    return { ok: true as const, slug: listing.slug };
  } catch (error) {
    message(error);
  }
}
