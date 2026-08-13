"use server";

import { redirect } from "next/navigation";
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

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  const isDealer = session.user.role === "DEALER";
  const displayName = company || name;
  const slug = user!.slug ?? (await uniqueUserSlug(displayName, session.user.id));

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      phone: phone || null,
      company: company || null,
      about: about || null,
      logoUrl: logoUrl || null,
      licenseNumber: isDealer ? licenseNumber || null : null,
      address: address || null,
      website: website || null,
      instagramUrl: instagramUrl || null,
      facebookUrl: facebookUrl || null,
      slug,
    },
  });

  redirect("/dashboard/profile?saved=1");
}
