"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireBuyer() {
  const session = await auth();
  if (!session) redirect("/buyer/login");
  return session;
}

export async function toggleSavedProperty(formData: FormData) {
  const session = await requireBuyer();
  const propertyId = String(formData.get("propertyId") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/buyer/dashboard");
  if (!propertyId) redirect(redirectTo);

  const existing = await prisma.savedProperty.findUnique({
    where: { userId_propertyId: { userId: session.user.id, propertyId } },
  });

  if (existing) {
    await prisma.savedProperty.delete({ where: { id: existing.id } });
  } else {
    await prisma.savedProperty.create({ data: { userId: session.user.id, propertyId } });
  }

  redirect(redirectTo);
}

export async function updateBuyerProfile(formData: FormData) {
  const session = await requireBuyer();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== session.user.id) {
      redirect("/buyer/dashboard?error=email");
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: name || "Buyer",
      email: email || null,
      phone: phone || null,
    },
  });

  redirect("/buyer/dashboard?saved=1");
}
