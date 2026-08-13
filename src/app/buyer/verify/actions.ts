"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { requestOtp } from "@/lib/otp";

export async function verifyBuyerOtp(formData: FormData) {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const otp = String(formData.get("otp") ?? "").trim();

  if (!identifier || !otp) {
    redirect(`/buyer/verify?identifier=${encodeURIComponent(identifier)}&error=required`);
  }

  try {
    await signIn("buyer-otp", { identifier, otp, redirectTo: "/buyer/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/buyer/verify?identifier=${encodeURIComponent(identifier)}&error=invalid`);
    }
    throw error;
  }
}

export async function resendBuyerOtp(formData: FormData) {
  const identifier = String(formData.get("identifier") ?? "").trim();
  if (!identifier) redirect("/buyer/login");

  const result = await requestOtp(identifier);
  if (!result.sent) {
    redirect(`/buyer/login?error=send&identifier=${encodeURIComponent(identifier)}`);
  }

  redirect(
    `/buyer/verify?identifier=${encodeURIComponent(result.identifier)}&channel=${result.channel}&resent=1`
  );
}
