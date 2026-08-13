"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { unlockAgentListing } from "@/lib/unlock";

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
