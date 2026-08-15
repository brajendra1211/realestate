"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { submitRating, RatingServiceError } from "@/lib/rating";

export async function submitRatingAction(formData: FormData) {
  const agentCode = String(formData.get("agentCode") ?? "");
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const stars = Number(formData.get("stars"));
  const review = String(formData.get("review") ?? "");

  const agent = await prisma.agentProfile.findUnique({ where: { agentCode } });
  if (!agent) redirect("/");

  try {
    await submitRating({ agentId: agent!.id, customerPhone, stars, review });
  } catch (error) {
    const code = error instanceof RatingServiceError ? error.message : "unknown";
    redirect(`/rate/${agentCode}?error=${code}`);
  }

  redirect(`/rate/${agentCode}?saved=1`);
}
