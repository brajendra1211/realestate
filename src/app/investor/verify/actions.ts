"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { requestOtp } from "@/lib/otp";

export async function verifyInvestorOtp(formData: FormData) {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const otp = String(formData.get("otp") ?? "").trim();

  if (!identifier || !otp) {
    redirect(`/investor/verify?identifier=${encodeURIComponent(identifier)}&error=required`);
  }

  try {
    await signIn("investor-otp", { identifier, otp, redirectTo: "/investor/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/investor/verify?identifier=${encodeURIComponent(identifier)}&error=invalid`);
    }
    throw error;
  }
}

export async function resendInvestorOtp(formData: FormData) {
  const identifier = String(formData.get("identifier") ?? "").trim();
  if (!identifier) redirect("/investor/login");

  const result = await requestOtp(identifier);
  if (!result.sent) {
    redirect(`/investor/login?error=send&identifier=${encodeURIComponent(identifier)}`);
  }

  redirect(
    `/investor/verify?identifier=${encodeURIComponent(result.identifier)}&channel=${result.channel}&resent=1`
  );
}
