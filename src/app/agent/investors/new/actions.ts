"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { registerInvestor, InvestorServiceError } from "@/lib/investor";

export type CreateInvestorState = { error?: string; redirectTo?: string };

export async function createInvestor(
  _prevState: CreateInvestorState,
  formData: FormData
): Promise<CreateInvestorState> {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") redirect("/login");

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");
  if (agent.status !== "APPROVED" || !agent.primeStatus) {
    return { error: "notPrime" };
  }

  try {
    await registerInvestor(agent.id, {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
    });
  } catch (error) {
    if (error instanceof InvestorServiceError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/agent/investors");
  return { redirectTo: "/agent/investors?saved=1" };
}
