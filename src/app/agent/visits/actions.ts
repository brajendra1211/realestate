"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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

export type VisitOtpState = { error?: string; redirectTo?: string };

export async function requestVisitOtpAction(
  _prevState: VisitOtpState,
  formData: FormData
): Promise<VisitOtpState> {
  await requireAgent();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const masterId = String(formData.get("masterId") ?? "").trim();
  const customerName = String(formData.get("customerName") ?? "").trim();

  if (!customerPhone || !masterId) {
    return { error: "validation" };
  }

  const result = await requestVisitOtp(customerPhone);
  if (!result.sent) {
    return { error: "send" };
  }

  return {
    redirectTo: `/agent/visits/verify?customerPhone=${encodeURIComponent(result.identifier)}&masterId=${encodeURIComponent(masterId)}&customerName=${encodeURIComponent(customerName)}&channel=${result.channel}`,
  };
}

export type LogVisitState = { error?: string; redirectTo?: string };

export async function logVisitAction(
  _prevState: LogVisitState,
  formData: FormData
): Promise<LogVisitState> {
  const agent = await requireAgent();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const customerName = String(formData.get("customerName") ?? "").trim();
  const masterId = String(formData.get("masterId") ?? "").trim();
  const otp = String(formData.get("otp") ?? "").trim();

  const masterProperty = await prisma.masterProperty.findUnique({ where: { masterId } });
  if (!masterProperty) {
    return { error: "propertyNotFound" };
  }

  try {
    const result = await logVisit({
      agentId: agent.id,
      customerPhone,
      customerName,
      masterPropertyId: masterProperty.id,
      otp,
    });

    if (result.isConflict) {
      return {
        redirectTo: `/agent/visits?conflict=1&masterId=${encodeURIComponent(masterId)}&originalAgent=${encodeURIComponent(result.originalAgentCode ?? "")}`,
      };
    }
    revalidatePath("/agent/visits");
    return { redirectTo: "/agent/visits" };
  } catch (error) {
    if (error instanceof VisitLogServiceError) {
      return { error: error.message };
    }
    throw error;
  }
}
