"use server";

import { requestOtp, otpRoleConflict, otpWaitMessage } from "@/lib/otp";

export type InvestorLoginState = { error?: string; redirectTo?: string };

export async function requestInvestorOtp(
  _prevState: InvestorLoginState,
  formData: FormData
): Promise<InvestorLoginState> {
  const raw = String(formData.get("identifier") ?? "").trim();
  if (!raw) return { error: "required" };

  const conflict = await otpRoleConflict(raw, "INVESTOR");
  if (conflict) return { error: conflict };

  const result = await requestOtp(raw);
  if (result.retryAfter) return { error: otpWaitMessage(result.retryAfter) };
  if (!result.sent) return { error: "send" };

  return {
    redirectTo: `/investor/verify?identifier=${encodeURIComponent(result.identifier)}&channel=${result.channel}`,
  };
}
