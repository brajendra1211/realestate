"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { requestOtp } from "@/lib/otp";

export type InvestorVerifyState = { error?: string; redirectTo?: string };

export async function verifyInvestorOtp(
  _prevState: InvestorVerifyState,
  formData: FormData
): Promise<InvestorVerifyState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const otp = String(formData.get("otp") ?? "").trim();

  if (!identifier || !otp) return { error: "required" };

  try {
    const redirectTo = await signIn("investor-otp", {
      identifier,
      otp,
      redirect: false,
      redirectTo: "/investor/dashboard",
    });
    return { redirectTo: typeof redirectTo === "string" ? redirectTo : "/investor/dashboard" };
  } catch (error) {
    if (error instanceof AuthError) return { error: "invalid" };
    throw error;
  }
}

export async function resendInvestorOtp(
  _prevState: InvestorVerifyState,
  formData: FormData
): Promise<InvestorVerifyState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  if (!identifier) return { redirectTo: "/investor/login" };

  const result = await requestOtp(identifier);
  if (!result.sent) {
    return { redirectTo: `/investor/login?error=send&identifier=${encodeURIComponent(identifier)}` };
  }

  return {
    redirectTo: `/investor/verify?identifier=${encodeURIComponent(result.identifier)}&channel=${result.channel}&resent=1`,
  };
}
