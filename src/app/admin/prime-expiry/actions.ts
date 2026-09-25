"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { activateAgentPrime } from "@/lib/agent";

async function requireAdmin() {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUBADMIN")) {
    redirect("/login");
  }
  return session;
}

/**
 * Admin action to directly activate or renew 30-day Prime status for a Channel Partner.
 */
export async function adminRenewAgentPrimeAction(formData: FormData) {
  await requireAdmin();

  const agentId = String(formData.get("agentId") ?? "").trim();
  if (!agentId) redirect("/admin/prime-expiry?error=missing_agent");

  // Find a Prime plan (price >= 2000) or any active agent plan
  const plan =
    (await prisma.plan.findFirst({
      where: { role: { in: ["AGENT", "BOTH"] }, price: { gte: 2000 }, active: true },
    })) ??
    (await prisma.plan.findFirst({
      where: { role: { in: ["AGENT", "BOTH"] }, active: true },
      orderBy: { price: "desc" },
    }));

  if (!plan) {
    redirect("/admin/prime-expiry?error=no_plan");
  }

  try {
    await activateAgentPrime(agentId, plan.id);
  } catch (error) {
    redirect(`/admin/prime-expiry?error=${error instanceof Error ? error.message : "failed"}`);
  }

  revalidatePath("/admin/prime-expiry");
  revalidatePath("/admin/billing");
  revalidatePath("/admin/agents");
  revalidatePath("/agent/dashboard");
  redirect("/admin/prime-expiry?saved=renewed");
}
