"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = { error?: string; redirectTo?: string };

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const identifier = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/");

  const { prisma } = await import("@/lib/prisma");
  const { looksLikeEmail, phoneDigitsMatch } = await import("@/lib/otp");

  let user = null;
  if (looksLikeEmail(identifier)) {
    user = await prisma.user.findUnique({ where: { email: identifier.toLowerCase() } });
  } else {
    // Try by phone
    user = (await prisma.user.findMany({ where: { phone: { not: null } } })).find((u) =>
      phoneDigitsMatch(u.phone, identifier)
    );
    // Try by Agent Code
    if (!user) {
      const agent = await prisma.agentProfile.findUnique({
        where: { agentCode: identifier.toUpperCase() },
        include: { user: true },
      });
      if (agent?.user) user = agent.user;
    }
    // Try by Investor Code
    if (!user) {
      const investor = await prisma.investorProfile.findUnique({
        where: { investorCode: identifier.toUpperCase() },
        include: { user: true },
      });
      if (investor?.user) user = investor.user;
    }
  }

  // Determine smart redirect target based on user's role
  let targetUrl = callbackUrl;
  if (!targetUrl || targetUrl === "/" || targetUrl === "/login") {
    if (user?.role === "ADMIN" || user?.role === "SUBADMIN") {
      targetUrl = "/admin";
    } else if (user?.role === "AGENT") {
      targetUrl = "/agent/dashboard";
    } else if (user?.role === "INVESTOR") {
      targetUrl = "/investor/dashboard";
    } else if (user?.role === "OWNER" || user?.role === "DEALER") {
      targetUrl = "/dashboard";
    } else if (user?.role === "BUYER") {
      targetUrl = "/buyer/dashboard";
    } else {
      targetUrl = "/";
    }
  }

  try {
    const redirectTo = await signIn("credentials", {
      email: identifier,
      password,
      redirect: false,
      redirectTo: targetUrl,
    });
    return { redirectTo: typeof redirectTo === "string" ? redirectTo : targetUrl };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid Email, Phone, Partner Code or Password. Please try again." };
    }
    throw error;
  }
}
