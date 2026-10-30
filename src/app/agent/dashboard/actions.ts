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

export async function upgradeAgentPlanAction(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const tier = String(formData.get("tier") ?? "PRIME") as "BASIC" | "PRIME";
  const { getSiteSettings } = await import("@/lib/site-settings");
  const { prisma } = await import("@/lib/prisma");
  const settings = await getSiteSettings();
  const price = tier === "PRIME" ? settings.agentPrimePlanPrice : settings.agentBasicPlanPrice;

  const targetPlan = await prisma.plan.findFirst({
    where: { role: "AGENT", listingLimit: tier === "PRIME" ? 999999 : 10 },
  });

  if (!targetPlan) {
    redirect("/agent/dashboard?error=planNotFound");
  }

  await prisma.subscription.updateMany({
    where: { userId: session.user.id, status: "ACTIVE" },
    data: { status: "EXPIRED" },
  });

  await prisma.subscription.create({
    data: {
      userId: session.user.id,
      planId: targetPlan.id,
      status: "ACTIVE",
      amount: price,
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.agentProfile.update({
    where: { id: agent.id },
    data: {
      planTier: tier,
      primeStatus: true,
      visibilityDeprioritized: false,
    },
  });

  revalidatePath("/agent/dashboard");
  revalidatePath("/agent/listings");
  redirect("/agent/dashboard?saved=plan");
}

