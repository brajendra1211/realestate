"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { adminAssignInterest, adminRebuzzInterest, closeInterest } from "@/lib/buyerInterest";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");
}

export async function assignInterestAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const agentId = String(formData.get("agentId") ?? "");
  if (id && agentId) await adminAssignInterest(id, agentId);
  revalidatePath("/admin/buyer-leads");
}

export async function rebuzzInterestAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) await adminRebuzzInterest(id);
  revalidatePath("/admin/buyer-leads");
}

export async function closeInterestAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (id) await closeInterest(id, note || undefined);
  revalidatePath("/admin/buyer-leads");
}
