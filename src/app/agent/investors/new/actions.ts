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

  const dobStr = String(formData.get("dateOfBirth") ?? "").trim();
  const dateOfBirth = dobStr ? new Date(dobStr) : null;

  try {
    await registerInvestor(agent.id, {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      secondaryPhone: String(formData.get("secondaryPhone") ?? ""),
      whatsappNumber: String(formData.get("whatsappNumber") ?? ""),
      age: formData.get("age") ? Number(formData.get("age")) : null,
      dateOfBirth,
      panNumber: String(formData.get("panNumber") ?? ""),
      panCardUrl: String(formData.get("panCardUrl") ?? "") || null,
      aadhaarNumber: String(formData.get("aadhaarNumber") ?? ""),
      aadhaarFrontUrl: String(formData.get("aadhaarFrontUrl") ?? "") || null,
      aadhaarBackUrl: String(formData.get("aadhaarBackUrl") ?? "") || null,
      address: String(formData.get("address") ?? ""),
      website: String(formData.get("website") ?? ""),
      bankAccountName: String(formData.get("bankAccountName") ?? ""),
      bankAccountNumber: String(formData.get("bankAccountNumber") ?? ""),
      bankIfsc: String(formData.get("bankIfsc") ?? ""),
      bankName: String(formData.get("bankName") ?? ""),
      bankBranch: String(formData.get("bankBranch") ?? ""),
      cancelledChequeUrl: String(formData.get("cancelledChequeUrl") ?? "") || null,
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
