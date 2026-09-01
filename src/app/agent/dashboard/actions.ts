"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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

  revalidatePath("/agent/dashboard");
}

export async function setAutoPayMandateAction(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const vpa = String(formData.get("vpa") ?? "").trim();
  if (!vpa || !vpa.includes("@")) {
    redirect("/agent/dashboard?mandateError=invalid");
  }

  const { setAgentAutoPayMandate } = await import("@/lib/agentPlans");
  try {
    await setAgentAutoPayMandate(agent.id, vpa);
  } catch {
    redirect("/agent/dashboard?mandateError=failed");
  }

  revalidatePath("/agent/dashboard");
  redirect("/agent/dashboard?saved=mandate");
}

