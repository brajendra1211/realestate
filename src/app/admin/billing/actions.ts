"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { checkAllPrimeRenewals } from "@/lib/billing";

export async function runBillingCheckAction() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { renewed, demoted } = await checkAllPrimeRenewals();
  redirect(`/admin/billing?saved=1&renewed=${renewed}&demoted=${demoted}`);
}
