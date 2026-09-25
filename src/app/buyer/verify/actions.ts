"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { requestOtp } from "@/lib/otp";

export type BuyerVerifyState = { error?: string; redirectTo?: string };

export async function verifyBuyerOtp(
  _prevState: BuyerVerifyState,
  formData: FormData
): Promise<BuyerVerifyState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const otp = String(formData.get("otp") ?? "").trim();
  const next = String(formData.get("next") ?? "").trim();
  let redirectTarget = next.startsWith("/") && next !== "/" && next !== "/login" && next !== "/buyer/dashboard" ? next : "";

  if (!redirectTarget) {
    const { prisma } = await import("@/lib/prisma");
    const { looksLikeEmail, phoneDigitsMatch } = await import("@/lib/otp");
    const isEmail = looksLikeEmail(identifier);
    let user = isEmail
      ? await prisma.user.findUnique({ where: { email: identifier } })
      : null;
    if (!user && !isEmail) {
      const candidates = await prisma.user.findMany({ where: { phone: { not: null } } });
      user = candidates.find((u) => phoneDigitsMatch(u.phone, identifier)) ?? null;
    }

    if (user) {
      switch (user.role) {
        case "ADMIN":
        case "SUBADMIN":
          redirectTarget = "/admin";
          break;
        case "AGENT":
          redirectTarget = "/agent/dashboard";
          break;
        case "INVESTOR":
          redirectTarget = "/investor/dashboard";
          break;
        case "DEALER":
        case "OWNER":
          redirectTarget = "/dashboard";
          break;
        case "BUYER":
        default:
          redirectTarget = "/buyer/dashboard";
          break;
      }
    } else {
      redirectTarget = "/buyer/dashboard";
    }
  }

  if (!identifier || !otp) return { error: "required" };

  try {
    const redirectTo = await signIn("buyer-otp", {
      identifier,
      otp,
      redirect: false,
      redirectTo: redirectTarget,
    });
    return { redirectTo: typeof redirectTo === "string" ? redirectTo : redirectTarget };
  } catch (error) {
    if (error instanceof AuthError) return { error: "invalid" };
    throw error;
  }
}

export async function resendBuyerOtp(
  _prevState: BuyerVerifyState,
  formData: FormData
): Promise<BuyerVerifyState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const next = String(formData.get("next") ?? "").trim();
  const nextQuery = next.startsWith("/") ? `&next=${encodeURIComponent(next)}` : "";
  if (!identifier) return { redirectTo: "/buyer/login" };

  const result = await requestOtp(identifier);
  if (!result.sent) {
    return { redirectTo: `/buyer/login?error=send&identifier=${encodeURIComponent(identifier)}${nextQuery}` };
  }

  return {
    redirectTo: `/buyer/verify?identifier=${encodeURIComponent(result.identifier)}&channel=${result.channel}&resent=1${nextQuery}`,
  };
}
