"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { AdminUserError, createUserByAdmin, deleteUserByAdmin, updateUserByAdmin } from "@/lib/adminUsers";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");
  return session;
}

const s = (formData: FormData, key: string) => String(formData.get(key) ?? "");
const msg = (e: unknown, fallback: string) => (e instanceof AdminUserError ? e.message : fallback);

export async function updateUserAction(formData: FormData) {
  await requireAdmin();
  const id = s(formData, "id");
  try {
    await updateUserByAdmin({
      id,
      name: s(formData, "name"),
      email: s(formData, "email"),
      phone: s(formData, "phone"),
      secondaryPhone: s(formData, "secondaryPhone"),
      whatsappNumber: s(formData, "whatsappNumber"),
      company: s(formData, "company"),
      address: s(formData, "address"),
    });
  } catch (e) {
    redirect(`/admin/people/${id}?error=${encodeURIComponent(msg(e, "Could not save changes."))}`);
  }
  revalidatePath(`/admin/people/${id}`);
  revalidatePath("/admin/people");
  redirect(`/admin/people/${id}?saved=1`);
}

export async function deleteUserAction(formData: FormData) {
  const session = await requireAdmin();
  const id = s(formData, "id");
  try {
    await deleteUserByAdmin(id, session.user.id);
  } catch (e) {
    redirect(`/admin/people/${id}?error=${encodeURIComponent(msg(e, "Could not delete this user."))}`);
  }
  revalidatePath("/admin/people");
  redirect("/admin/people?deleted=1");
}

export async function createUserAction(formData: FormData) {
  await requireAdmin();
  let id: string;
  try {
    const user = await createUserByAdmin({
      name: s(formData, "name"),
      phone: s(formData, "phone"),
      email: s(formData, "email"),
      role: s(formData, "role"),
      password: s(formData, "password"),
    });
    id = user.id;
  } catch (e) {
    redirect(`/admin/people?error=${encodeURIComponent(msg(e, "Could not create the user."))}`);
  }
  revalidatePath("/admin/people");
  redirect(`/admin/people/${id}?saved=1`);
}
