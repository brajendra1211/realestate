"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import {
  createAreaAssignment,
  deleteAreaAssignment,
  AreaRoutingServiceError,
} from "@/lib/areaRouting";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");
}

export async function createAreaAssignmentAction(formData: FormData) {
  await requireAdmin();
  const pincode = String(formData.get("pincode") ?? "");
  const agentId = String(formData.get("agentId") ?? "");

  try {
    await createAreaAssignment(pincode, agentId);
  } catch (error) {
    const code = error instanceof AreaRoutingServiceError ? error.message : "unknown";
    redirect(`/admin/area-routing?error=${code}`);
  }

  revalidatePath("/admin/area-routing");
}

export async function deleteAreaAssignmentAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  await deleteAreaAssignment(id);
  revalidatePath("/admin/area-routing");
}
