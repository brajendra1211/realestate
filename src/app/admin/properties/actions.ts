"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");
}

export async function assignPropertyAgentAction(formData: FormData) {
  await requireAdmin();
  const propertyId = String(formData.get("propertyId") ?? "");
  const agentId = String(formData.get("agentId") ?? "").trim();
  if (!propertyId) return;

  await prisma.property.update({
    where: { id: propertyId },
    data: { assignedAgentId: agentId || null },
  });

  revalidatePath("/admin/properties");
}
