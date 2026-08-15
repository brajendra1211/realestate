"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { createAppointment, markCompleted, cancelAppointment, AppointmentServiceError } from "@/lib/appointment";
import { prisma } from "@/lib/prisma";

async function requireAgent() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") redirect("/login");
  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");
  return agent;
}

export async function scheduleAppointmentAction(formData: FormData) {
  const agent = await requireAgent();
  const buyerId = String(formData.get("buyerId") ?? "");
  const masterId = String(formData.get("masterId") ?? "").trim();
  const scheduledAt = String(formData.get("scheduledAt") ?? "");

  const masterProperty = masterId
    ? await prisma.masterProperty.findUnique({ where: { masterId } })
    : null;

  try {
    await createAppointment({
      buyerId,
      agentId: agent.id,
      masterPropertyId: masterProperty?.id ?? null,
      scheduledAt: new Date(scheduledAt),
    });
  } catch (error) {
    const code = error instanceof AppointmentServiceError ? error.message : "unknown";
    redirect(`/agent/appointments?error=${code}`);
  }

  redirect("/agent/appointments?saved=1");
}

export async function markCompletedAction(formData: FormData) {
  await requireAgent();
  const id = String(formData.get("id") ?? "");
  await markCompleted(id);
  redirect("/agent/appointments?saved=completed");
}

export async function cancelAppointmentAction(formData: FormData) {
  await requireAgent();
  const id = String(formData.get("id") ?? "");
  await cancelAppointment(id);
  redirect("/agent/appointments?saved=cancelled");
}
