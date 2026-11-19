"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { grantBrochureCredits } from "@/lib/brochure";

export async function grantCreditsAction(formData: FormData) {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUBADMIN")) redirect("/login");

  const agentId = String(formData.get("agentId") ?? "");
  const credits = Math.floor(Number(formData.get("credits")));
  if (!agentId || !Number.isFinite(credits) || credits < 1 || credits > 1000) {
    redirect("/admin/brochures?err=" + encodeURIComponent("Credits 1 se 1000 ke beech daaliye."));
  }
  await grantBrochureCredits(agentId, { amount: 0, credits, source: "ADMIN", note: `Granted by ${session.user.name ?? "admin"}` });
  revalidatePath("/admin/brochures");
  redirect("/admin/brochures?ok=" + encodeURIComponent(`${credits} credits de diye gaye.`));
}
