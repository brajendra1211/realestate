"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = { error?: string; redirectTo?: string };

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/");

  let targetUrl = callbackUrl;
  if (!targetUrl || targetUrl === "/") {
    const { prisma } = await import("@/lib/prisma");
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      switch (user.role) {
        case "ADMIN":
        case "SUBADMIN":
          targetUrl = "/admin";
          break;
        case "AGENT":
          targetUrl = "/agent/dashboard";
          break;
        case "INVESTOR":
          targetUrl = "/investor/dashboard";
          break;
        case "BUYER":
          targetUrl = "/buyer/dashboard";
          break;
        case "DEALER":
        case "OWNER":
        default:
          targetUrl = "/dashboard";
          break;
      }
    }
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
