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
    return { sent: false, channel, identifier };
  }

  if (!isMailerConfigured()) return { sent: false, channel, identifier };
  const sent = await sendEmail(
    identifier,
    "Your BayaEstate login code",
    `<p>Your login code is <strong>${code}</strong>. It expires in ${OTP_EXPIRY_MINUTES} minutes.</p>`
  );
  return { sent, channel, identifier };
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
