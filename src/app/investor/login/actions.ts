"use server";

import { redirect } from "next/navigation";
import { requestOtp } from "@/lib/otp";

export async function requestInvestorOtp(formData: FormData) {
  const raw = String(formData.get("identifier") ?? "").trim();
  if (!raw) redirect("/investor/login?error=required");

  const result = await requestOtp(raw);

  if (!result.sent) {
    redirect(`/investor/login?error=send&identifier=${encodeURIComponent(raw)}`);
  }

  redirect(`/investor/verify?identifier=${encodeURIComponent(result.identifier)}&channel=${result.channel}`);
}
