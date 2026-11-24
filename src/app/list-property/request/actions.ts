"use server";

import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { slugify } from "@/lib/slug";
import { requestOtp, verifyOtp, looksLikeEmail } from "@/lib/otp";
import {
  createListingRequest,
  createRequestPaymentOrder,
  confirmRequestPaymentRazorpay,
  rebuzzRequest,
  otpIdentifierFor,
  ListingRequestError,
} from "@/lib/listingRequest";

export type RequestFormInput = {
  ownerName: string;
  ownerPhone: string;
  ownerEmail?: string;
  password?: string;
  otp?: string;
  city: string;
  locality?: string;
  plan: "BASIC" | "GOLD";
  purpose?: "RENT" | "SELL";
  referredByAgentCode?: string;
};

function friendly(error: unknown): never {
  if (error instanceof ListingRequestError) throw new Error(error.message);
  throw error;
}

const last10 = (phone: string) => phone.replace(/[^\d]/g, "").slice(-10);

async function uniqueUserSlug(name: string) {
  const base = slugify(name) || "user";
  let slug = base;
  let n = 1;
  while (await prisma.user.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

/** Sends the WhatsApp OTP that proves the owner's number before an account is created. */
export async function sendRequestOtpAction(phone: string) {
  const digits = last10(phone);
  if (digits.length !== 10) throw new Error("Please enter a valid 10-digit mobile number.");
  const taken = await prisma.user.findFirst({ where: { phone: { contains: digits } }, select: { id: true } });
  if (taken) throw new Error("This number is already registered. Please log in, then list your property.");
  const result = await requestOtp(otpIdentifierFor(digits));
  if (!result.sent) throw new Error("We couldn't send the OTP. Please try again in a minute.");
  return { ok: true as const };
}

type StartResult =
  | { ok: true; requestId: string; statusToken: string; amount: number; order: { id: string; amount: number; currency: string }; keyId: string }
  | { ok: false; registered: boolean; error: string };

/**
 * Step 1+2: verify the number (OTP), create the owner's account, save the request, then open Razorpay.
 * There is no unpaid path. Logged-in owners skip the account part.
 */
export async function startListingRequestAction(form: RequestFormInput): Promise<StartResult> {
  const session = await auth();
  let userId = session && session.user.role === "OWNER" ? session.user.id : null;
  let registered = false;

  try {
    if (!userId) {
      const email = (form.ownerEmail ?? "").trim().toLowerCase();
      const password = form.password ?? "";
      const name = form.ownerName.trim();
      if (!name || last10(form.ownerPhone).length !== 10) throw new ListingRequestError("Please enter your name and a valid 10-digit mobile number.");
      if (!looksLikeEmail(email)) throw new ListingRequestError("Please enter a valid email address.");
      if (password.length < 8) throw new ListingRequestError("Choose a password of at least 8 characters.");
      if (await prisma.user.findUnique({ where: { email } })) {
        throw new ListingRequestError("This email is already registered. Please log in, then list your property.");
      }
      if (await prisma.user.findFirst({ where: { phone: { contains: last10(form.ownerPhone) } }, select: { id: true } })) {
        throw new ListingRequestError("This number is already registered. Please log in, then list your property.");
      }
      if (!(await verifyOtp(otpIdentifierFor(form.ownerPhone), (form.otp ?? "").trim()))) {
        throw new ListingRequestError("The WhatsApp OTP is not correct or has expired.");
      }

      const user = await prisma.user.create({
        data: {
          name,
          email,
          phone: last10(form.ownerPhone),
          slug: await uniqueUserSlug(name),
          passwordHash: await hashPassword(password),
          role: "OWNER",
        },
      });
      userId = user.id;
      registered = true;
      try {
        await signIn("credentials", { email, password, redirect: false });
      } catch (error) {
        if (!(error instanceof AuthError)) throw error;
      }
    }

    const request = await createListingRequest({ ...form, userId });
    const { order, keyId } = await createRequestPaymentOrder(request.id);
    if (!order || !keyId) throw new ListingRequestError("Online payment is not set up yet. Please try again later.");
    return { ok: true, requestId: request.id, statusToken: request.statusToken, amount: request.amount, order, keyId };
  } catch (error) {
    if (error instanceof ListingRequestError) return { ok: false, registered, error: error.message };
    throw error;
  }
}

async function assertToken(requestId: string, statusToken: string) {
  const r = await prisma.listingRequest.findUnique({ where: { id: requestId }, select: { statusToken: true } });
  if (!r || r.statusToken !== statusToken) throw new Error("Request not found.");
}

export async function verifyRequestPaymentAction(
  requestId: string,
  statusToken: string,
  orderId: string,
  paymentId: string,
  signature: string,
) {
  await assertToken(requestId, statusToken);
  try {
    const request = await confirmRequestPaymentRazorpay(requestId, orderId, paymentId, signature);
    // Rent: the owner now adds the property details. Sell: our team takes over (status page).
    return { ok: true as const, next: request.purpose === "SELL" ? "status" : ("details" as "status" | "details"), formToken: request.formToken };
  } catch (error) {
    friendly(error);
  }
}

/** The owner buzzes the partners in range again (no extra payment) while nobody has accepted. */
export async function rebuzzAction(requestId: string, statusToken: string) {
  await assertToken(requestId, statusToken);
  try {
    const reached = await rebuzzRequest(requestId);
    return { ok: true as const, reached };
  } catch (error) {
    friendly(error);
  }
}
