"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { approveAgent, rejectAgent, activateAgentPrime, AgentServiceError } from "@/lib/agent";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login");
  }
  return session;
}

export async function approveAgentAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await approveAgent(id);
  revalidatePath("/admin/agents");
}

export async function rejectAgentAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "");
  await rejectAgent(id, reason);
  revalidatePath("/admin/agents");
}

export async function activatePrimeAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const planId = String(formData.get("planId") ?? "");
  if (!planId) redirect("/admin/agents?error=plan");

  try {
    await activateAgentPrime(id, planId);
  } catch (error) {
    if (error instanceof AgentServiceError) {
      redirect(`/admin/agents?error=${error.message}`);
    }
    throw error;
  }

  revalidatePath("/admin/agents");
}
