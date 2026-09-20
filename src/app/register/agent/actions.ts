"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { submitAgentApplication, AgentServiceError, type AgentDocumentInput } from "@/lib/agent";

function readDoc(
  formData: FormData,
  field: string,
  type: AgentDocumentInput["type"]
): AgentDocumentInput | null {
  const url = String(formData.get(field) ?? "").trim();
  return url ? { type, url } : null;
}

export type RegisterAgentState = { error?: string; redirectTo?: string };

export async function registerAgent(
  _prevState: RegisterAgentState,
  formData: FormData
): Promise<RegisterAgentState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  const documents = [
    readDoc(formData, "reraDocUrl", "RERA_CERTIFICATE"),
    readDoc(formData, "tradeLicenseDocUrl", "TRADE_LICENSE"),
    readDoc(formData, "gstDocUrl", "GST_CERTIFICATE"),
    readDoc(formData, "aadhaarFrontUrl", "AADHAAR_CARD_FRONT"),
    readDoc(formData, "aadhaarBackUrl", "AADHAAR_CARD_BACK"),
    readDoc(formData, "panCardUrl", "PAN_CARD"),
    readDoc(formData, "cancelledChequeUrl", "CANCELLED_CHEQUE"),
  ].filter((doc): doc is AgentDocumentInput => doc !== null);

  const dobStr = String(formData.get("dateOfBirth") ?? "").trim();
  const dateOfBirth = dobStr ? new Date(dobStr) : null;

  try {
    await submitAgentApplication({
      name: String(formData.get("name") ?? ""),
      email,
      phone: String(formData.get("phone") ?? ""),
      alternatePhone: String(formData.get("alternatePhone") ?? ""),
      whatsappNumber: String(formData.get("whatsappNumber") ?? ""),
      age: formData.get("age") ? Number(formData.get("age")) : null,
      dateOfBirth,
      panNumber: String(formData.get("panNumber") ?? ""),
      panCardUrl: String(formData.get("panCardUrl") ?? "") || null,
      aadhaarNumber: String(formData.get("aadhaarNumber") ?? ""),
      aadhaarFrontUrl: String(formData.get("aadhaarFrontUrl") ?? "") || null,
      aadhaarBackUrl: String(formData.get("aadhaarBackUrl") ?? "") || null,
      website: String(formData.get("website") ?? ""),
      bankAccountName: String(formData.get("bankAccountName") ?? ""),
      bankAccountNumber: String(formData.get("bankAccountNumber") ?? ""),
      bankIfsc: String(formData.get("bankIfsc") ?? ""),
      bankName: String(formData.get("bankName") ?? ""),
      bankBranch: String(formData.get("bankBranch") ?? ""),
      cancelledChequeUrl: String(formData.get("cancelledChequeUrl") ?? "") || null,
      password,
      shopName: String(formData.get("shopName") ?? ""),
      shopAddress: String(formData.get("shopAddress") ?? ""),
      city: String(formData.get("city") ?? ""),
      yearsExperience: formData.get("yearsExperience")
        ? Number(formData.get("yearsExperience"))
        : null,
      staffCount: formData.get("staffCount") ? Number(formData.get("staffCount")) : null,
      reraNumber: String(formData.get("reraNumber") ?? ""),
      gstNumber: String(formData.get("gstNumber") ?? ""),
      documents,
      referredByAgentCode: String(formData.get("referredByAgentCode") ?? ""),
    });
  } catch (error) {
    if (error instanceof AgentServiceError) {
      return { error: error.message };
    }
    throw error;
  }

  try {
    const redirectTo = await signIn("credentials", {
      email,
      password,
      redirect: false,
      redirectTo: "/agent/dashboard",
    });
    return { redirectTo: typeof redirectTo === "string" ? redirectTo : "/agent/dashboard" };
  } catch (error) {
    if (error instanceof AuthError) {
      return { redirectTo: "/login" };
    }
    throw error;
  }
}
