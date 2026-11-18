"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const SLA_MS = 2 * 60 * 60 * 1000; // resolve within 2 hours
const CATEGORIES = ["COMMISSION_CONFLICT", "CUSTOMER_COMPLAINT", "WEBSITE_FEEDBACK"] as const;

export async function createTicketAction(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login?next=/support");

  const category = String(formData.get("category") ?? "");
  const subject = String(formData.get("subject") ?? "").trim().slice(0, 150);
  const message = String(formData.get("message") ?? "").trim().slice(0, 4000);
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number]) || !subject || !message) {
    redirect("/support?error=missing");
  }

  await prisma.supportTicket.create({
    data: {
      userId: session.user.id,
      role: session.user.role,
      category: category as (typeof CATEGORIES)[number],
      subject,
      message,
      dueAt: new Date(Date.now() + SLA_MS),
    },
  });
  revalidatePath("/support");
  revalidatePath("/admin/support");
  redirect("/support?sent=1");
}
