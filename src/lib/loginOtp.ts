import { prisma } from "@/lib/prisma";
import {
  requestOtp,
  looksLikeEmail,
  normalizeIdentifier,
  findAccountByPhone,
  otpRoleConflict,
  otpWaitMessage,
} from "@/lib/otp";

export type LoginRole = "BUYER" | "OWNER" | "AGENT" | "INVESTOR";

export const OTP_PROVIDER: Record<LoginRole, string> = {
  BUYER: "buyer-otp",
  OWNER: "owner-otp",
  AGENT: "agent-otp",
  INVESTOR: "investor-otp",
};

const LABEL: Record<LoginRole, string> = {
  BUYER: "Buyer",
  OWNER: "Owner",
  AGENT: "Channel Partner",
  INVESTOR: "Referral Partner",
};

type Result =
  | { ok: true; identifier: string; channel: string }
  | { ok: false; error: string; status: number };

/**
 * One OTP request for any panel. A number/email that belongs to another role is refused with a clear
 * message; only the buyer panel may create a new account (on the first successful code).
 */
export async function requestLoginOtp(role: LoginRole, raw: string): Promise<Result> {
  const identifier = normalizeIdentifier(raw);
  if (!identifier) return { ok: false, error: "Enter your phone number or email.", status: 400 };
  if (!looksLikeEmail(identifier) && identifier.length < 10) {
    return { ok: false, error: "Enter a valid 10-digit mobile number.", status: 400 };
  }

  const conflict = await otpRoleConflict(identifier, role);
  if (conflict) return { ok: false, error: conflict, status: 409 };

  if (role !== "BUYER") {
    const account = looksLikeEmail(identifier)
      ? await prisma.user.findUnique({ where: { email: identifier }, select: { role: true } })
      : await findAccountByPhone(identifier.slice(-10));
    if (!account) {
      return { ok: false, error: `No ${LABEL[role]} account found for this ${looksLikeEmail(identifier) ? "email" : "number"}.`, status: 404 };
    }
  }

  const result = await requestOtp(identifier);
  if (result.retryAfter) return { ok: false, error: otpWaitMessage(result.retryAfter), status: 429 };
  if (!result.sent) return { ok: false, error: "We couldn't send the code. Please try again in a minute.", status: 502 };
  return { ok: true, identifier: result.identifier, channel: result.channel };
}

/** Where each role lands after signing in. */
export function homeFor(role: string) {
  switch (role) {
    case "ADMIN":
    case "SUBADMIN":
      return "/admin";
    case "AGENT":
      return "/agent/dashboard";
    case "INVESTOR":
      return "/investor/dashboard";
    case "OWNER":
      return "/dashboard";
    case "BUYER":
      return "/buyer/dashboard";
    default:
      return "/";
  }
}
