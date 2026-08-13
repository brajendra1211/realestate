"use server";

import { redirect } from "next/navigation";
import { requestOtp } from "@/lib/otp";

export async function requestBuyerOtp(formData: FormData) {
  const raw = String(formData.get("identifier") ?? "").trim();
  if (!raw) redirect("/buyer/login?error=required");

  const result = await requestOtp(raw);

  if (!result.sent) {
    redirect(`/buyer/login?error=send&identifier=${encodeURIComponent(raw)}`);
  }

  redirect(
    `/buyer/verify?identifier=${encodeURIComponent(result.identifier)}&channel=${result.channel}`
  );
}
