"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAgentByUserId } from "@/lib/agent";
import {
  createBroadcast,
  respondToBroadcast,
  sendAgentChatMessage,
  closeBroadcast,
  BroadcastServiceError,
} from "@/lib/broadcast";
import type { BroadcastTxnType } from "@/generated/prisma";

async function requirePrimeAgent() {
  const session = await auth();
  if (!session) redirect("/login");
  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");
  if (agent.status !== "APPROVED" || !agent.primeStatus) redirect("/agent/dashboard");
  return agent;
}

export async function createBroadcastAction(formData: FormData) {
  const agent = await requirePrimeAgent();

  const radiusKm = Number(formData.get("radiusKm") ?? 1);
  const society = String(formData.get("society") ?? "");
  const flatSize = String(formData.get("flatSize") ?? "");
  const txnType = String(formData.get("txnType") ?? "BUY") as BroadcastTxnType;
  const budgetMin = Number(formData.get("budgetMin") ?? 0);
  const budgetMax = Number(formData.get("budgetMax") ?? 0);

  try {
    await createBroadcast(agent.id, { radiusKm, society, flatSize, txnType, budgetMin, budgetMax });
  } catch (error) {
    const code = error instanceof BroadcastServiceError ? error.message : "unknown";
    redirect(`/agent/broadcast/new?error=${code}`);
  }

  redirect("/agent/broadcast?saved=1");
}

export async function respondToBroadcastAction(formData: FormData) {
  const agent = await requirePrimeAgent();
  const broadcastId = String(formData.get("broadcastId") ?? "");

  try {
    await respondToBroadcast(broadcastId, agent.id);
  } catch (error) {
    const code = error instanceof BroadcastServiceError ? error.message : "unknown";
    redirect(`/agent/broadcast?error=${code}`);
  }

  const broadcast = await prisma.broadcast.findUnique({
    where: { id: broadcastId },
    select: { agentId: true },
  });
  redirect(`/agent/broadcast/${broadcastId}/chat/${broadcast?.agentId}`);
}

export async function sendChatMessageAction(formData: FormData) {
  const agent = await requirePrimeAgent();
  const broadcastId = String(formData.get("broadcastId") ?? "");
  const toAgentId = String(formData.get("toAgentId") ?? "");
  const message = String(formData.get("message") ?? "");

  try {
    await sendAgentChatMessage(broadcastId, agent.id, toAgentId, message);
  } catch {
    // Swallow and just re-render the thread as-is (e.g. empty message) —
    // no destructive state to roll back.
  }

  redirect(`/agent/broadcast/${broadcastId}/chat/${toAgentId}`);
}

export async function closeBroadcastAction(formData: FormData) {
  const agent = await requirePrimeAgent();
  const broadcastId = String(formData.get("broadcastId") ?? "");
  await closeBroadcast(broadcastId, agent.id);
  redirect("/agent/broadcast?saved=closed");
}
