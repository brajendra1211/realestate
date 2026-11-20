import { prisma } from "@/lib/prisma";

// Shared field rules for agent + referral-partner registration. Error codes
// returned here are shown by the forms (see ERROR_MESSAGES in each form).

export function ageFromDob(dob: Date, now = new Date()): number {
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

/** Last 10 digits of an Indian mobile number, ignoring +91 / 0 / spaces / dashes. */
export function normalizePhone(raw: string | null | undefined): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export const isValidMobile = (raw: string) => /^[6-9]\d{9}$/.test(normalizePhone(raw));
export const isPersonName = (s: string) => /^[A-Za-z][A-Za-z .'-]*$/.test(s.trim());
export const isAccountNumber = (s: string) => /^\d{9,18}$/.test(s.trim());

export const upper = (s: string | null | undefined) => (s ?? "").trim().toUpperCase();

/** True when any existing user already has this mobile (compared on its last 10 digits). */
export async function isPhoneInUse(raw: string): Promise<boolean> {
  const digits = normalizePhone(raw);
  if (digits.length !== 10) return false;
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM User
    WHERE phone IS NOT NULL
      AND RIGHT(REGEXP_REPLACE(phone, '[^0-9]', ''), 10) = ${digits}
    LIMIT 1`;
  return rows.length > 0;
}

export type KycFields = {
  name: string;
  phone: string;
  dateOfBirth: Date | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  requireDob?: boolean;
};

/** Returns an error code, or null when everything is fine. */
export async function validateKycFields(f: KycFields): Promise<string | null> {
  if (!isPersonName(f.name)) return "invalidName";
  if (!isValidMobile(f.phone)) return "invalidPhone";
  const hasDob = !!f.dateOfBirth && !Number.isNaN(f.dateOfBirth.getTime());
  if (!hasDob && f.requireDob) return "dobRequired";
  if (hasDob && ageFromDob(f.dateOfBirth!) < 18) return "underAge";
  if (f.bankAccountName?.trim() && !isPersonName(f.bankAccountName)) return "invalidBankName";
  if (f.bankAccountNumber?.trim() && !isAccountNumber(f.bankAccountNumber)) return "invalidAccountNumber";
  if (await isPhoneInUse(f.phone)) return "phoneInUse";
  return null;
}
