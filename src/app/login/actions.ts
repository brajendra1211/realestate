"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = { error?: string; redirectTo?: string };

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/");

  const { prisma } = await import("@/lib/prisma");
  const { looksLikeEmail, phoneDigitsMatch } = await import("@/lib/otp");

  const user = looksLikeEmail(email)
    ? await prisma.user.findUnique({ where: { email } })
    : (await prisma.user.findMany({ where: { phone: { not: null } } })).find((u) =>
        phoneDigitsMatch(u.phone, email)
      );

  if (user && !["ADMIN", "SUBADMIN"].includes(user.role)) {
    return {
      error: "Password login is restricted to Admins only. Please use OTP to sign in.",
    };
  }

  let targetUrl = callbackUrl;
  if (!targetUrl || targetUrl === "/") {
    targetUrl = "/admin";
  }

  try {
    const redirectTo = await signIn("credentials", {
      email,
      password,
      redirect: false,
      redirectTo: targetUrl,
    });
    return { redirectTo: typeof redirectTo === "string" ? redirectTo : targetUrl };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }
}
