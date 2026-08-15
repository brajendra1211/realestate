"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { processAgentPayout, rejectAgentPayout } from "@/lib/payout";
import type { PaymentMode } from "@/generated/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/login");
  }
  return session;
}

export async function processPayoutAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const paymentMode = String(formData.get("paymentMode") ?? "BANK_TRANSFER") as PaymentMode;
  await processAgentPayout(id, paymentMode);
  redirect("/admin/payouts?saved=paid");
}

export async function rejectPayoutAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await rejectAgentPayout(id);
  redirect("/admin/payouts?saved=rejected");
}
