"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { confirmInvestorPayment, updateInvestorCapital, InvestorServiceError } from "@/lib/investor";
import type { PaymentMode } from "@/generated/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login");
  }
  return session;
}

export async function confirmInvestorPaymentAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const paymentMode = String(formData.get("paymentMode") ?? "BANK_TRANSFER") as PaymentMode;
  await confirmInvestorPayment(id, paymentMode);
  redirect("/admin/investors?saved=1");
}

export async function updateInvestorCapitalAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const totalInvested = Number(formData.get("totalInvested"));

  try {
    await updateInvestorCapital(id, totalInvested);
  } catch (error) {
    const code = error instanceof InvestorServiceError ? error.message : "unknown";
    redirect(`/admin/investors?error=${code}`);
  }

  redirect("/admin/investors?saved=capital");
}
