"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUBADMIN")) redirect("/login");
  return session;
}

export async function updateBuyLeadAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const staffId = String(formData.get("staffId") ?? "") || null;
  const staffNote = String(formData.get("staffNote") ?? "").trim() || null;
  const contacted = formData.get("contacted") === "on";
  const existing = await prisma.dispatchRequest.findUnique({ where: { id }, select: { contactedAt: true, purpose: true } });
  if (!existing || existing.purpose !== "BUY") return;
  await prisma.dispatchRequest.update({
    where: { id },
    data: {
      staffId,
      staffNote,
      contactedAt: contacted ? (existing.contactedAt ?? new Date()) : null,
    },
  });
  revalidatePath("/admin/buy-leads");
}
