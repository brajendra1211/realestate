"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { checkAllPrimeRenewals } from "@/lib/billing";

export type BillingCheckState = { renewed: number; demoted: number } | null;

export async function runBillingCheckAction(): Promise<BillingCheckState> {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { renewed, demoted } = await checkAllPrimeRenewals();
  revalidatePath("/admin/billing");
  return { renewed, demoted };
}
