"use server";

import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";
import {
  submitAgentApplication,
  getAgentByUserId,
  AgentServiceError,
  type AgentDocumentInput,
} from "@/lib/agent";
import { createRegistrationOrder, confirmRegistrationPayment } from "@/lib/agentRegistrationPayment";
import { sendAgentRegistrationOtp } from "@/lib/agent";

function readDoc(
  formData: FormData,
  field: string,
  type: AgentDocumentInput["type"]
): AgentDocumentInput | null {
  const url = String(formData.get(field) ?? "").trim();
  return url ? { type, url } : null;
}

export type RegisterAgentState = { error?: string; redirectTo?: string; payNow?: boolean };

async function requireAgentProfile() {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") throw new AgentServiceError("unauthorized");
  const agent = await getAgentByUserId(session.user.id);
  if (!agent) throw new AgentServiceError("notFound");
  return agent;
}

export async function createRegistrationOrderAction(planId: string) {
  try {
    const agent = await requireAgentProfile();
    return { ok: true as const, ...(await createRegistrationOrder(agent.id, planId)) };
  } catch (error) {
    if (error instanceof AgentServiceError) return { ok: false as const, error: error.message };
    throw error;
  }
}

export async function confirmRegistrationPaymentAction(
  planId: string,
  p: { razorpayOrderId?: string; razorpayPaymentId?: string; razorpaySignature?: string }
) {
  try {
    const agent = await requireAgentProfile();
    await confirmRegistrationPayment(agent.id, planId, p);
    return { ok: true as const };
  } catch (error) {
    if (error instanceof AgentServiceError) return { ok: false as const, error: error.message };
    throw error;
  }
}

/** Sends the WhatsApp OTP that proves the mobile number before registering. */
export async function sendRegisterOtpAction(phone: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await sendAgentRegistrationOtp(phone);
    return { ok: true };
  } catch (error) {
    if (error instanceof AgentServiceError) return { ok: false, error: error.message };
    throw error;
  }
}

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

  // Identity + bank documents are mandatory; business certificates are
  // mandatory whenever the matching number was entered.
  const has = (field: string) => Boolean(String(formData.get(field) ?? "").trim());
  const missingDoc =
    !has("panCardUrl") ||
    !has("aadhaarFrontUrl") ||
    !has("aadhaarBackUrl") ||
    !has("cancelledChequeUrl") ||
    (has("reraNumber") && !has("reraDocUrl")) ||
    (has("gstNumber") && !has("gstDocUrl"));
  if (missingDoc) return { error: "documentsRequired" };
  const payNow = String(formData.get("intent") ?? "pay") !== "later";
  if (payNow && !has("planId")) return { error: "planRequired" };

  const dobStr = String(formData.get("dateOfBirth") ?? "").trim();
  const dateOfBirth = dobStr ? new Date(dobStr) : null;
  if (!dateOfBirth) return { error: "dobRequired" };

  try {
    await submitAgentApplication({
      name: String(formData.get("name") ?? ""),
      email,
      phone: String(formData.get("phone") ?? ""),
      alternatePhone: String(formData.get("alternatePhone") ?? ""),
      whatsappNumber: String(formData.get("whatsappNumber") ?? ""),
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
      otp: String(formData.get("otp") ?? ""),
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
    // Account + documents are saved (status PENDING). The client now opens
    // payment; a successful payment auto-approves, otherwise admin reviews.
    return {
      payNow,
      redirectTo: typeof redirectTo === "string" ? redirectTo : "/agent/dashboard",
    };
  } catch (error) {
    if (error instanceof AuthError) {
      return { redirectTo: "/login" };
    }
    throw error;
  }
}
