"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { requestOtp } from "@/lib/otp";

export async function verifyBuyerOtp(formData: FormData) {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const otp = String(formData.get("otp") ?? "").trim();
  const next = String(formData.get("next") ?? "").trim();
  const redirectTo = next.startsWith("/") ? next : "/buyer/dashboard";
  const nextQuery = next.startsWith("/") ? `&next=${encodeURIComponent(next)}` : "";

  if (!identifier || !otp) {
    redirect(`/buyer/verify?identifier=${encodeURIComponent(identifier)}&error=required${nextQuery}`);
  }

  try {
    await signIn("buyer-otp", { identifier, otp, redirectTo });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/buyer/verify?identifier=${encodeURIComponent(identifier)}&error=invalid${nextQuery}`);
    }
    throw error;
  }
}

export async function resendBuyerOtp(formData: FormData) {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const next = String(formData.get("next") ?? "").trim();
  const nextQuery = next.startsWith("/") ? `&next=${encodeURIComponent(next)}` : "";
  if (!identifier) redirect("/buyer/login");

  const result = await requestOtp(identifier);
  if (!result.sent) {
    redirect(`/buyer/login?error=send&identifier=${encodeURIComponent(identifier)}${nextQuery}`);
  }

  redirect(
    `/buyer/verify?identifier=${encodeURIComponent(result.identifier)}&channel=${result.channel}&resent=1${nextQuery}`
  );
}
