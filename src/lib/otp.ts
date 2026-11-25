import { prisma } from "@/lib/prisma";
import { sendWhatsAppOtp, isWhatsAppConfigured } from "@/lib/whatsapp";
import { sendAbwplOtp, verifyAbwplOtp, isAbwplConfigured, toAbwplPhone } from "@/lib/abwpl";
import { sendEmail, isMailerConfigured } from "@/lib/mailer";
import { getSiteSettings } from "@/lib/site-settings";

const OTP_EXPIRY_MINUTES = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function looksLikeEmail(identifier: string) {
  return EMAIL_PATTERN.test(identifier.trim());
}

export function normalizeIdentifier(raw: string) {
  const trimmed = raw.trim();
  if (looksLikeEmail(trimmed)) return trimmed.toLowerCase();
  return trimmed.replace(/[^\d]/g, "");
}

// Phone numbers get stored in whatever format they were entered in (e.g.
// registration forms save "+91 90000 00003"), while OTP identifiers are
// digits-only with no country code. An exact-match lookup between the two
// never matches. Compare by the last 10 digits instead, so a stored number
// with or without a country code/spaces/dashes still matches what the user
// types to request an OTP.
export function phoneDigitsMatch(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return false;
  const digitsA = a.replace(/[^\d]/g, "").slice(-10);
  const digitsB = b.replace(/[^\d]/g, "").slice(-10);
  return digitsA.length === 10 && digitsA === digitsB;
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export type OtpChannel = "WHATSAPP" | "EMAIL";

// WhatsApp is preferred whenever the identifier is a phone number and either
// WhatsApp integration is configured; email is the fallback (and the only
// option for email identifiers, or when neither is set up).
export function resolveOtpChannel(identifier: string): OtpChannel {
  if (looksLikeEmail(identifier)) return "EMAIL";
  return isAbwplConfigured() || isWhatsAppConfigured() ? "WHATSAPP" : "EMAIL";
}

// Dev-only: when WhatsApp/email aren't configured (or delivery fails) in a
// non-production environment, print the code to the server console instead
// of blocking the login flow, so OTP login is testable without real
// WhatsApp/SMTP credentials.
const isDev = process.env.NODE_ENV !== "production";

// One OTP per identifier per minute (the WhatsApp provider enforces the same window). Kept in memory:
// good enough to stop button-mashing, and a restart simply resets it.
export const OTP_COOLDOWN_SECONDS = 60;
const lastSentAt = new Map<string, number>();

export function otpCooldownLeft(identifier: string) {
  const at = lastSentAt.get(normalizeIdentifier(identifier));
  if (!at) return 0;
  return Math.max(0, Math.ceil((at + OTP_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000));
}

export type RequestOtpResult = { sent: boolean; channel: OtpChannel; identifier: string; retryAfter?: number };

export async function requestOtp(rawIdentifier: string): Promise<RequestOtpResult> {
  const identifier = normalizeIdentifier(rawIdentifier);
  const channel = resolveOtpChannel(identifier);
  const wait = otpCooldownLeft(identifier);
  if (wait > 0) return { sent: false, channel, identifier, retryAfter: wait };
  const result = await sendOtpNow(identifier, channel);
  if (result.sent) lastSentAt.set(identifier, Date.now());
  return result;
}

export function otpWaitMessage(seconds: number) {
  return `Please wait ${seconds} seconds before asking for another OTP.`;
}

const ROLE_LABEL: Record<string, string> = {
  BUYER: "Buyer",
  OWNER: "Owner",
  AGENT: "Channel Partner",
  INVESTOR: "Referral Partner",
  ADMIN: "staff",
  SUBADMIN: "staff",
};

/** Finds the account that owns a phone number (matching on the last 10 digits, whatever format it was saved in). */
export async function findAccountByPhone(digits10: string) {
  const rows = await prisma.$queryRaw<{ id: string; role: string }[]>`
    SELECT id, role FROM User
    WHERE phone IS NOT NULL
      AND RIGHT(REGEXP_REPLACE(phone, '[^0-9]', ''), 10) = ${digits10}
    LIMIT 1`;
  return rows[0] ?? null;
}

/**
 * Strict panels: a number or email belongs to exactly one role. Returns a readable message when the
 * identifier is already registered under a different role, otherwise null.
 */
export async function otpRoleConflict(rawIdentifier: string, expected: string): Promise<string | null> {
  const identifier = normalizeIdentifier(rawIdentifier);
  const isEmail = looksLikeEmail(identifier);
  const account = isEmail
    ? await prisma.user.findUnique({ where: { email: identifier }, select: { id: true, role: true } })
    : await findAccountByPhone(identifier.slice(-10));
  if (!account || account.role === expected) return null;
  const has = ROLE_LABEL[account.role] ?? account.role;
  const want = ROLE_LABEL[expected] ?? expected;
  return `This ${isEmail ? "email" : "number"} is already registered as ${has}. Please use the ${has} login, or use a different ${isEmail ? "email" : "number"} for ${want}.`;
}

async function sendOtpNow(identifier: string, channel: OtpChannel): Promise<RequestOtpResult> {

  // abwpl (src/lib/abwpl.ts) owns code generation, delivery, and
  // verification end-to-end for phone OTPs — no local OtpCode row is
  // created for this path; verifyOtp() below delegates to abwpl too, using
  // the same resolveOtpChannel() decision so the two stay in sync without
  // needing to persist which provider handled a given identifier.
  if (channel === "WHATSAPP" && isAbwplConfigured()) {
    const sent = await sendAbwplOtp(toAbwplPhone(identifier));
    return { sent, channel, identifier };
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.otpCode.create({ data: { identifier, channel, code, expiresAt } });

  if (channel === "WHATSAPP") {
    const sent = await sendWhatsAppOtp(identifier, code);
    if (sent) return { sent: true, channel, identifier };
    // WhatsApp delivery failed (e.g. no approved template + outside the 24h
    // window) — fall back to email only if this identifier looks like one,
    // which it won't for a phone number, so just report the failure.
    if (isDev) {
      console.log(`[dev otp] ${identifier} (${channel}): ${code}`);
      return { sent: true, channel, identifier };
    }
    return { sent: false, channel, identifier };
  }

  if (!isMailerConfigured()) {
    if (isDev) {
      console.log(`[dev otp] ${identifier} (${channel}): ${code}`);
      return { sent: true, channel, identifier };
    }
    return { sent: false, channel, identifier };
  }
  const { siteName } = await getSiteSettings();
  const sent = await sendEmail(
    identifier,
    `Your ${siteName} login code`,
    `<p>Your login code is <strong>${code}</strong>. It expires in ${OTP_EXPIRY_MINUTES} minutes.</p>`
  );
  if (sent) return { sent: true, channel, identifier };
  if (isDev) {
    console.log(`[dev otp] ${identifier} (${channel}): ${code}`);
    return { sent: true, channel, identifier };
  }
  return { sent: false, channel, identifier };
}

export async function verifyOtp(identifier: string, code: string) {
  if (resolveOtpChannel(identifier) === "WHATSAPP" && isAbwplConfigured()) {
    return verifyAbwplOtp(toAbwplPhone(identifier), code);
  }

  const record = await prisma.otpCode.findFirst({
    where: { identifier, code, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return false;

  await prisma.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
  return true;
}
