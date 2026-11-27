import { createHmac, timingSafeEqual } from "crypto";
import { verifyOtp } from "@/lib/otp";

/**
 * "This number was OTP-verified" proof. The OTP provider burns a code the first time it is checked, so a
 * registration form cannot verify the code on one screen and again on submit. Instead the app verifies the
 * code once (POST /api/otp/verify) and gets this short-lived signed token, which the register endpoint
 * accepts in place of the OTP.
 */
const TTL_MS = 20 * 60 * 1000;
const secret = () => process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret";

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

export function issuePhoneProof(digits10: string) {
  const payload = `${digits10}.${Date.now() + TTL_MS}`;
  return `${payload}.${sign(payload)}`;
}

export function checkPhoneProof(digits10: string, token: string | null | undefined) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [phone, exp, sig] = parts;
  if (phone !== digits10 || Number(exp) < Date.now()) return false;
  const good = sign(`${phone}.${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(good);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Accepts either a proof token (verified earlier) or a fresh OTP code. */
export async function phoneIsProven(identifier: string, digits10: string, otp: string | null | undefined, proof: string | null | undefined) {
  if (checkPhoneProof(digits10, proof)) return true;
  return verifyOtp(identifier, (otp ?? "").trim());
}
