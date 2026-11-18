"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";

export async function resolveTicketAction(formData: FormData) {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUBADMIN")) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const resolution = String(formData.get("resolution") ?? "").trim() || null;
  if (!id || !["IN_REVIEW", "RESOLVED"].includes(status)) return;

  const ticket = await prisma.supportTicket.update({
    where: { id },
    data: {
      status: status as "IN_REVIEW" | "RESOLVED",
      resolution,
      resolvedAt: status === "RESOLVED" ? new Date() : null,
    },
  });
  if (status === "RESOLVED") {
    const user = await prisma.user.findUnique({ where: { id: ticket.userId }, select: { phone: true, email: true, name: true } });
    if (user) {
      await notifyUser(user, `Your support request "${ticket.subject}" has been resolved. ${resolution ?? ""}`, "Support request resolved");
    }
  }
  revalidatePath("/admin/support");
}
