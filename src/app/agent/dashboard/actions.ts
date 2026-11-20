"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getAgentByUserId, AgentServiceError } from "@/lib/agent";
import { createPlanOrder, confirmPlanPayment, type PlanPaymentMode } from "@/lib/agentRegistrationPayment";
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

// Plan upgrades/first-time activation now go through a real payment — see
// AgentPlanPayButton. (The old free "upgrade" action created a paid-looking
// subscription without any payment and was removed.)
async function requireAgentForPlan() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") throw new AgentServiceError("unauthorized");
  const agent = await getAgentByUserId(session.user.id);
  if (!agent) throw new AgentServiceError("notFound");
  return agent;
}

export async function createPlanOrderAction(planId: string, mode: PlanPaymentMode) {
  try {
    const agent = await requireAgentForPlan();
    return { ok: true as const, ...(await createPlanOrder(agent.id, planId, mode)) };
  } catch (error) {
    if (error instanceof AgentServiceError) return { ok: false as const, error: error.message };
    throw error;
  }
}

export async function confirmPlanPaymentAction(
  planId: string,
  mode: PlanPaymentMode,
  p: { razorpayOrderId?: string; razorpayPaymentId?: string; razorpaySignature?: string }
) {
  try {
    const agent = await requireAgentForPlan();
    await confirmPlanPayment(agent.id, planId, mode, p);
    revalidatePath("/agent/dashboard");
    revalidatePath("/agent/listings");
    return { ok: true as const };
  } catch (error) {
    if (error instanceof AgentServiceError) return { ok: false as const, error: error.message };
    throw error;
  }
}
