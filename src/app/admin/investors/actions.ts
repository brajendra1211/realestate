"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { confirmInvestorPayment } from "@/lib/investor";

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
  await confirmInvestorPayment(id);
  redirect("/admin/investors?saved=1");
}
