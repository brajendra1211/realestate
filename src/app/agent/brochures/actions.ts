"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import {
  BrochureError,
  confirmBrochureRecharge,
  createBrochure,
  createBrochureRechargeOrder,
} from "@/lib/brochure";

async function requireAgent() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") redirect("/login");
  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");
  return agent;
}

export async function generateBrochureAction(formData: FormData) {
  const agent = await requireAgent();
  const ref = String(formData.get("property") ?? "");
  let id: string;
  try {
    id = (await createBrochure(agent.id, ref)).id;
  } catch (e) {
    const msg = e instanceof BrochureError ? e.message : "Brochure nahi ban paya. Dobara try kijiye.";
    redirect(`/agent/brochures?err=${encodeURIComponent(msg)}`);
  }
  redirect(`/agent/brochures/${id}`);
}

export async function createRechargeOrderAction() {
  const agent = await requireAgent();
  return createBrochureRechargeOrder(agent.id);
}

export async function confirmRechargeAction(p: {
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
}) {
  const agent = await requireAgent();
  await confirmBrochureRecharge(agent.id, p);
  return { ok: true };
}
