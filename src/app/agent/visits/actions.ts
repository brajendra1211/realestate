"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { requestVisitOtp, logVisit, VisitLogServiceError } from "@/lib/visitLog";
import { prisma } from "@/lib/prisma";

async function requireAgent() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") redirect("/login");
  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");
  return agent;
}

export async function requestVisitOtpAction(formData: FormData) {
  await requireAgent();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const masterId = String(formData.get("masterId") ?? "").trim();
  const customerName = String(formData.get("customerName") ?? "").trim();

  if (!customerPhone || !masterId) {
    redirect("/agent/visits/new?error=validation");
  }

  const result = await requestVisitOtp(customerPhone);
  if (!result.sent) {
    redirect(`/agent/visits/new?error=send&customerPhone=${encodeURIComponent(customerPhone)}&masterId=${encodeURIComponent(masterId)}`);
  }

  redirect(
    `/agent/visits/verify?customerPhone=${encodeURIComponent(result.identifier)}&masterId=${encodeURIComponent(masterId)}&customerName=${encodeURIComponent(customerName)}&channel=${result.channel}`
  );
}

export async function logVisitAction(formData: FormData) {
  const agent = await requireAgent();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const customerName = String(formData.get("customerName") ?? "").trim();
  const masterId = String(formData.get("masterId") ?? "").trim();
  const otp = String(formData.get("otp") ?? "").trim();

  const masterProperty = await prisma.masterProperty.findUnique({ where: { masterId } });
  if (!masterProperty) {
    redirect(
      `/agent/visits/verify?customerPhone=${encodeURIComponent(customerPhone)}&masterId=${encodeURIComponent(masterId)}&customerName=${encodeURIComponent(customerName)}&error=propertyNotFound`
    );
  }

  try {
    const result = await logVisit({
      agentId: agent.id,
      customerPhone,
      customerName,
      masterPropertyId: masterProperty!.id,
      otp,
    });

    if (result.isConflict) {
      redirect(
        `/agent/visits?conflict=1&masterId=${encodeURIComponent(masterId)}&originalAgent=${encodeURIComponent(result.originalAgentCode ?? "")}`
      );
    }
    redirect("/agent/visits?saved=1");
  } catch (error) {
    if (error instanceof VisitLogServiceError) {
      redirect(
        `/agent/visits/verify?customerPhone=${encodeURIComponent(customerPhone)}&masterId=${encodeURIComponent(masterId)}&customerName=${encodeURIComponent(customerName)}&error=${error.message}`
      );
    }
    throw error;
  }
}
