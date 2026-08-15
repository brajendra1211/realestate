"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { recordDeal, DealServiceError } from "@/lib/deal";
import { distributeInvestorDealProfit, InvestorServiceError } from "@/lib/investor";
import type { PaymentMode } from "@/generated/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login");
  }
  return session;
}

export async function recordDealAction(formData: FormData) {
  await requireAdmin();

  const dealValue = Number(formData.get("dealValue"));
  const buyerAgentId = String(formData.get("buyerAgentId") ?? "") || null;
  const sellerAgentId = String(formData.get("sellerAgentId") ?? "") || null;
  const paymentMode = String(formData.get("paymentMode") ?? "BANK_TRANSFER") as PaymentMode;
  const note = String(formData.get("note") ?? "");

  try {
    await recordDeal({ dealValue, buyerAgentId, sellerAgentId, paymentMode, note });
  } catch (error) {
    const code = error instanceof DealServiceError ? error.message : "unknown";
    redirect(`/admin/deals?error=${code}`);
  }

  redirect("/admin/deals?saved=deal");
}

export async function distributeProfitAction(formData: FormData) {
  await requireAdmin();

  const investorProfileId = String(formData.get("investorProfileId") ?? "");
  const totalProfit = Number(formData.get("totalProfit"));
  const paymentMode = String(formData.get("paymentMode") ?? "BANK_TRANSFER") as PaymentMode;
  const note = String(formData.get("note") ?? "");
  const customerTransactionRef = String(formData.get("customerTransactionRef") ?? "");

  try {
    await distributeInvestorDealProfit({
      investorProfileId,
      totalProfit,
      paymentMode,
      note,
      customerTransactionRef,
    });
  } catch (error) {
    const code = error instanceof InvestorServiceError ? error.message : "unknown";
    redirect(`/admin/deals?error=${code}`);
  }

  redirect("/admin/deals?saved=profit");
}
