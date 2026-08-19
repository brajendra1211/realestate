"use server";

import { requestOtp } from "@/lib/otp";

export type BuyerLoginState = { error?: string; redirectTo?: string };

export async function requestBuyerOtp(
  _prevState: BuyerLoginState,
  formData: FormData
): Promise<BuyerLoginState> {
  const raw = String(formData.get("identifier") ?? "").trim();
  const next = String(formData.get("next") ?? "").trim();
  const nextQuery = next.startsWith("/") ? `&next=${encodeURIComponent(next)}` : "";

  if (!raw) return { error: "required" };

  const result = await requestOtp(raw);
  if (!result.sent) return { error: "send" };

  return {
    redirectTo: `/buyer/verify?identifier=${encodeURIComponent(result.identifier)}&channel=${result.channel}${nextQuery}`,
  };
}
