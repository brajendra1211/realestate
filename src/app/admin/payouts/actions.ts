"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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
  revalidatePath("/admin/payouts");
}

export async function rejectPayoutAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await rejectAgentPayout(id);
  revalidatePath("/admin/payouts");
}
