"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { requestAgentPayout, PayoutServiceError } from "@/lib/payout";

export async function requestPayoutAction(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const amount = Number(formData.get("amount"));

  try {
    await requestAgentPayout(agent.id, amount);
  } catch (error) {
    const code = error instanceof PayoutServiceError ? error.message : "unknown";
    redirect(`/agent/dashboard?error=${code}`);
  }

  redirect("/agent/dashboard?saved=payout");
}
