"use server";

import { redirect } from "next/navigation";
import { requestOtp } from "@/lib/otp";

export async function requestBuyerOtp(formData: FormData) {
  const raw = String(formData.get("identifier") ?? "").trim();
  const next = String(formData.get("next") ?? "").trim();
  const nextQuery = next.startsWith("/") ? `&next=${encodeURIComponent(next)}` : "";

  if (!raw) redirect(`/buyer/login?error=required${nextQuery}`);

  const result = await requestOtp(raw);

  if (!result.sent) {
    redirect(`/buyer/login?error=send&identifier=${encodeURIComponent(raw)}${nextQuery}`);
  }

  redirect(
    `/buyer/verify?identifier=${encodeURIComponent(result.identifier)}&channel=${result.channel}${nextQuery}`
  );
}
