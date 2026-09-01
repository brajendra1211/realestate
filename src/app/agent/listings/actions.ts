"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { renewPropertyListing } from "@/lib/listingDelist";
import type { ListingPlanTier } from "@/generated/prisma";

export async function renewListingAction(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const listingId = String(formData.get("listingId") ?? "");
  const planTier = (formData.get("planTier") === "GOLD" ? "GOLD" : "BASIC") as ListingPlanTier;

  if (!listingId) redirect("/agent/listings?error=invalid");

  try {
    await renewPropertyListing(listingId, planTier, agent.id);
  } catch (error) {
    console.error("Renewal error", error);
    redirect("/agent/listings?error=renewalFailed");
  }

  revalidatePath("/agent/listings");
  redirect("/agent/listings?saved=renewed");
}
