"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { OTP_PROVIDER, homeFor, requestLoginOtp, type LoginRole } from "@/lib/loginOtp";

const ROLES = Object.keys(OTP_PROVIDER);
const asRole = (v: string): LoginRole | null => (ROLES.includes(v) ? (v as LoginRole) : null);

export async function requestLoginOtpAction(role: string, identifier: string): Promise<{ error?: string; identifier?: string }> {
  const r = asRole(role);
  if (!r) return { error: "Unknown login type." };
  const result = await requestLoginOtp(r, identifier);
  return result.ok ? { identifier: result.identifier } : { error: result.error };
}

export async function verifyLoginOtpAction(
  role: string,
  identifier: string,
  otp: string,
  callbackUrl: string,
): Promise<{ error?: string; redirectTo?: string }> {
  const r = asRole(role);
  if (!r) return { error: "Unknown login type." };
  const target = callbackUrl && callbackUrl !== "/" && callbackUrl !== "/login" && callbackUrl.startsWith("/") ? callbackUrl : null;
  try {
    await signIn(OTP_PROVIDER[r], { identifier, otp: otp.trim(), redirect: false });
  } catch (error) {
    if (error instanceof AuthError) return { error: "That code is not correct or has expired." };
    throw error;
  }
  return { redirectTo: target ?? homeFor(r) };
}
