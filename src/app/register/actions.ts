"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { slugify } from "@/lib/slug";
import { signIn } from "@/auth";

async function uniqueUserSlug(name: string) {
  const base = slugify(name) || "user";
  let slug = base;
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.user.findUnique({ where: { slug } });
    if (!existing) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

export async function register(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const accountType = String(formData.get("accountType") ?? "OWNER");
  const role = accountType === "DEALER" ? "DEALER" : "OWNER";

  if (!name || !email || password.length < 8) {
    redirect("/register?error=validation");
  }
  if (role === "DEALER" && !company) {
    redirect("/register?error=company");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect("/register?error=duplicate");
  }

  await prisma.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      company: company || null,
      slug: await uniqueUserSlug(role === "DEALER" ? company || name : name),
      passwordHash: await hashPassword(password),
      role,
    },
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login");
    }
    throw error;
  }
}
