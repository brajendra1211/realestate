"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { approveGoldListing, rejectGoldListing } from "@/lib/goldListing";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");
}

export async function approveGoldListingAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await approveGoldListing(id);
  revalidatePath("/admin/gold-listings");
}

export async function rejectGoldListingAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await rejectGoldListing(id);
  revalidatePath("/admin/gold-listings");
}
