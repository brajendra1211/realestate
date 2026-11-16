"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { markLinkSent } from "@/lib/listingRequest";

async function requireAgent() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") redirect("/login");
  const agent = await prisma.agentProfile.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  if (!agent) redirect("/login");
  return agent;
}

/** Called when the partner shares the link (WhatsApp / copy) so the owner's status moves to "link sent". */
export async function markLinkSentAction(requestId: string) {
  const agent = await requireAgent();
  await markLinkSent(requestId, agent.id);
  revalidatePath("/agent/owner-requests");
}
