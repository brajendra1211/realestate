import { prisma } from "@/lib/prisma";
import { sendWhatsAppOtp, isWhatsAppConfigured } from "@/lib/whatsapp";
import { sendEmail, isMailerConfigured } from "@/lib/mailer";

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

// WhatsApp is preferred whenever the identifier is a phone number and the
// integration is configured; email is the fallback (and the only option for
// email identifiers, or when WhatsApp isn't set up).
export function resolveOtpChannel(identifier: string): OtpChannel {
  if (looksLikeEmail(identifier)) return "EMAIL";
  return isWhatsAppConfigured() ? "WHATSAPP" : "EMAIL";
}

// Dev-only: when WhatsApp/email aren't configured (or delivery fails) in a
// non-production environment, print the code to the server console instead
// of blocking the login flow, so OTP login is testable without real
// WhatsApp/SMTP credentials.
const isDev = process.env.NODE_ENV !== "production";

export async function requestOtp(rawIdentifier: string) {
  const identifier = normalizeIdentifier(rawIdentifier);
  const channel = resolveOtpChannel(identifier);
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
  const sent = await sendEmail(
    identifier,
    "Your BayaEstate login code",
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
  const record = await prisma.otpCode.findFirst({
    where: { identifier, code, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return false;

  await prisma.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
  return true;
}
