"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";

async function requireAdmin() {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUBADMIN")) {
    redirect("/login");
  }
  return session;
}

/**
 * Updates the platform-wide default targets for all Channel Partners.
 */
export async function updateGlobalTargetsAction(formData: FormData) {
  await requireAdmin();

  const partnerTargetDays = Math.max(1, parseInt(String(formData.get("partnerTargetDays") ?? "30"), 10) || 30);
  const partnerTargetProperties = Math.max(1, parseInt(String(formData.get("partnerTargetProperties") ?? "20"), 10) || 20);
  const partnerTargetSubPartners = Math.max(0, parseInt(String(formData.get("partnerTargetSubPartners") ?? "10"), 10) || 10);
  const partnerTargetInvestors = Math.max(0, parseInt(String(formData.get("partnerTargetInvestors") ?? "3"), 10) || 3);

  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {
      partnerTargetDays,
      partnerTargetProperties,
      partnerTargetSubPartners,
      partnerTargetInvestors,
    },
    create: {
      id: "singleton",
      partnerTargetDays,
      partnerTargetProperties,
      partnerTargetSubPartners,
      partnerTargetInvestors,
    },
  });

  revalidatePath("/admin/targets");
  revalidatePath("/agent/dashboard");
  redirect("/admin/targets?saved=global");
}

/**
 * Updates or sets a custom target override for an individual Channel Partner.
 */
export async function updatePartnerCustomTargetAction(formData: FormData) {
  await requireAdmin();

  const agentId = String(formData.get("agentId") ?? "").trim();
  if (!agentId) redirect("/admin/targets?error=missing_agent");

  const customTargetEnabled = formData.get("customTargetEnabled") === "true";
  const cycleDaysTarget = Math.max(1, parseInt(String(formData.get("cycleDaysTarget") ?? "30"), 10) || 30);
  const cycleCustomerPropertiesTarget = Math.max(1, parseInt(String(formData.get("cycleCustomerPropertiesTarget") ?? "20"), 10) || 20);
  const cycleDirectAgentsTarget = Math.max(0, parseInt(String(formData.get("cycleDirectAgentsTarget") ?? "10"), 10) || 10);
  const cycleInvestorsTarget = Math.max(0, parseInt(String(formData.get("cycleInvestorsTarget") ?? "3"), 10) || 3);

  await prisma.agentProfile.update({
    where: { id: agentId },
    data: {
      customTargetEnabled,
      cycleDaysTarget,
      cycleCustomerPropertiesTarget,
      cycleDirectAgentsTarget,
      cycleInvestorsTarget,
    },
  });

  revalidatePath("/admin/targets");
  revalidatePath("/agent/dashboard");
  redirect("/admin/targets?saved=partner");
}

/**
 * Resets the 30-day target cycle timer for a partner starting from today.
 */
export async function resetPartnerCycleAction(formData: FormData) {
  await requireAdmin();

  const agentId = String(formData.get("agentId") ?? "").trim();
  if (!agentId) redirect("/admin/targets?error=missing_agent");

  const [agent, settings] = await Promise.all([
    prisma.agentProfile.findUnique({ where: { id: agentId } }),
    getSiteSettings(),
  ]);

  if (!agent) redirect("/admin/targets?error=agent_not_found");

  const days = agent.customTargetEnabled && agent.cycleDaysTarget ? agent.cycleDaysTarget : (settings.partnerTargetDays ?? 30);
  const now = new Date();
  const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  await prisma.agentProfile.update({
    where: { id: agentId },
    data: {
      cycleStartDate: now,
      cycleEndDate: endDate,
    },
  });

  revalidatePath("/admin/targets");
  revalidatePath("/agent/dashboard");
  redirect("/admin/targets?saved=cycle_reset");
}
