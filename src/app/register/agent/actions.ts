"use server";

import { redirect } from "next/navigation";
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

export async function registerAgent(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  const documents = [
    readDoc(formData, "reraDocUrl", "RERA_CERTIFICATE"),
    readDoc(formData, "tradeLicenseDocUrl", "TRADE_LICENSE"),
    readDoc(formData, "gstDocUrl", "GST_CERTIFICATE"),
  ].filter((doc): doc is AgentDocumentInput => doc !== null);

  try {
    await submitAgentApplication({
      name: String(formData.get("name") ?? ""),
      email,
      phone: String(formData.get("phone") ?? ""),
      alternatePhone: String(formData.get("alternatePhone") ?? ""),
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
    });
  } catch (error) {
    if (error instanceof AgentServiceError) {
      redirect(`/register/agent?error=${error.message}`);
    }
    throw error;
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/agent/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login");
    }
    throw error;
  }
}
