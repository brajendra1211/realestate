"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { InvestorServiceError } from "@/lib/investor";
import { createInvestorFeeOrder, confirmInvestorFeeOnline } from "@/lib/investorFeePayment";

// Used by both the registering channel partner and the referral partner
// themselves; who may pay is enforced inside the lib.
async function requireUserId() {
  const session = await auth();
  if (!session) throw new InvestorServiceError("unauthorized");
  return session.user.id;
}

export async function createInvestorFeeOrderAction(investorProfileId: string) {
  try {
    return { ok: true as const, ...(await createInvestorFeeOrder(investorProfileId, await requireUserId())) };
  } catch (error) {
    if (error instanceof InvestorServiceError) return { ok: false as const, error: error.message };
    throw error;
  }
}

export async function confirmInvestorFeeAction(
  investorProfileId: string,
  p: { razorpayOrderId?: string; razorpayPaymentId?: string; razorpaySignature?: string }
) {
  try {
    await confirmInvestorFeeOnline(investorProfileId, await requireUserId(), p);
  } catch (error) {
    if (error instanceof InvestorServiceError) return { ok: false as const, error: error.message };
    throw error;
  }
  revalidatePath("/agent/investors");
  revalidatePath("/investor/dashboard");
  return { ok: true as const };
}
