"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { adminAssignRequest, adminCompleteRequest, alertAgents, cancelRequest } from "@/lib/listingRequest";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");
}

export async function assignRequestAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const agentId = String(formData.get("agentId") ?? "");
  if (!id) return;
  await adminAssignRequest(id, agentId || null);
  revalidatePath("/admin/listing-requests");
}

export async function realertRequestAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) await alertAgents(id);
  revalidatePath("/admin/listing-requests");
}

export async function cancelRequestAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (id) await cancelRequest(id, note || undefined);
  revalidatePath("/admin/listing-requests");
}

export async function completeRequestAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (id) await adminCompleteRequest(id, note || undefined);
  revalidatePath("/admin/listing-requests");
}
