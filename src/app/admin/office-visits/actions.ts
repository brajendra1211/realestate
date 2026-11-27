"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { logOfficeVisit, OfficeVisitError } from "@/lib/officeVisit";

export async function logOfficeVisitAction(formData: FormData) {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUBADMIN")) redirect("/login");

  const visitors = [0, 1, 2, 3, 4].map((i) => ({
    name: String(formData.get(`vName${i}`) ?? ""),
    mobile: String(formData.get(`vMobile${i}`) ?? ""),
    relation: String(formData.get(`vRelation${i}`) ?? ""),
    interest: String(formData.get(`vInterest${i}`) ?? ""),
  }));
  const when = String(formData.get("visitedAt") ?? "");
  try {
    await logOfficeVisit({
      agentCode: String(formData.get("agentCode") ?? ""),
      visited: String(formData.get("visited") ?? "yes") === "yes",
      visitedAt: when ? new Date(when) : null,
      notes: String(formData.get("notes") ?? ""),
      visitors,
      staff: { id: session.user.id, name: session.user.name ?? "Staff" },
    });
  } catch (e) {
    const msg = e instanceof OfficeVisitError ? e.message : "Could not save the visit.";
    redirect(`/admin/office-visits?error=${encodeURIComponent(msg)}`);
  }
  revalidatePath("/admin/office-visits");
  redirect("/admin/office-visits?saved=1");
}
