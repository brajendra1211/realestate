"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

async function uniqueUserSlug(name: string, ignoreId: string) {
  const base = slugify(name) || "user";
  let slug = base;
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.user.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const about = String(formData.get("about") ?? "").trim();
  const logoUrl = String(formData.get("logoUrl") ?? "").trim();
  const licenseNumber = String(formData.get("licenseNumber") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const instagramUrl = String(formData.get("instagramUrl") ?? "").trim();
  const facebookUrl = String(formData.get("facebookUrl") ?? "").trim();

  const secondaryPhone = String(formData.get("secondaryPhone") ?? "").trim();
  const whatsappNumber = String(formData.get("whatsappNumber") ?? "").trim();
  const ageStr = String(formData.get("age") ?? "").trim();
  const dobStr = String(formData.get("dateOfBirth") ?? "").trim();
  const panNumber = String(formData.get("panNumber") ?? "").trim().toUpperCase();
  const panCardUrl = String(formData.get("panCardUrl") ?? "").trim();
  const aadhaarNumber = String(formData.get("aadhaarNumber") ?? "").trim();
  const aadhaarFrontUrl = String(formData.get("aadhaarFrontUrl") ?? "").trim();
  const aadhaarBackUrl = String(formData.get("aadhaarBackUrl") ?? "").trim();

  const bankAccountName = String(formData.get("bankAccountName") ?? "").trim();
  const bankAccountNumber = String(formData.get("bankAccountNumber") ?? "").trim();
  const bankIfsc = String(formData.get("bankIfsc") ?? "").trim().toUpperCase();
  const bankName = String(formData.get("bankName") ?? "").trim();
  const bankBranch = String(formData.get("bankBranch") ?? "").trim();
  const cancelledChequeUrl = String(formData.get("cancelledChequeUrl") ?? "").trim();

  const age = ageStr ? parseInt(ageStr, 10) : null;
  const dateOfBirth = dobStr ? new Date(dobStr) : null;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  const displayName = company || name;
  const slug = user!.slug ?? (await uniqueUserSlug(displayName, session.user.id));

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      phone: phone || null,
      secondaryPhone: secondaryPhone || null,
      whatsappNumber: whatsappNumber || null,
      age: isNaN(age ?? NaN) ? null : age,
      dateOfBirth: dateOfBirth && !isNaN(dateOfBirth.getTime()) ? dateOfBirth : null,
      company: company || null,
      about: about || null,
      logoUrl: logoUrl || null,
            address: address || null,
      website: website || null,
      instagramUrl: instagramUrl || null,
      facebookUrl: facebookUrl || null,
      panNumber: panNumber || null,
      panCardUrl: panCardUrl || null,
      aadhaarNumber: aadhaarNumber || null,
      aadhaarFrontUrl: aadhaarFrontUrl || null,
      aadhaarBackUrl: aadhaarBackUrl || null,
      bankAccountName: bankAccountName || null,
      bankAccountNumber: bankAccountNumber || null,
      bankIfsc: bankIfsc || null,
      bankName: bankName || null,
      bankBranch: bankBranch || null,
      cancelledChequeUrl: cancelledChequeUrl || null,
      slug,
    },
  });

  revalidatePath("/dashboard/profile");
}
