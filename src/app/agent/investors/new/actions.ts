"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { registerInvestor, InvestorServiceError } from "@/lib/investor";

export async function createInvestor(formData: FormData) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") redirect("/login");

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");
  if (agent.status !== "APPROVED" || !agent.primeStatus) {
    redirect("/agent/investors/new?error=notPrime");
  }

  try {
    await registerInvestor(agent.id, {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
    });
  } catch (error) {
    if (error instanceof InvestorServiceError) {
      redirect(`/agent/investors/new?error=${error.message}`);
    }
    throw error;
  }

  redirect("/agent/investors?saved=1");
}
