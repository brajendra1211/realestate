"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = { error?: string; redirectTo?: string };

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const identifier = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/");
  const expectedRole = String(formData.get("expectedRole") ?? "");

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

  // Strict panels: a person can only sign in through the panel that matches their account.
  if (user && expectedRole) {
    const staff = user.role === "ADMIN" || user.role === "SUBADMIN";
    const ok = expectedRole === "ADMIN" ? staff : user.role === expectedRole;
    if (!ok) {
      const names: Record<string, string> = { BUYER: "Buyer", OWNER: "Owner", AGENT: "Channel partner", INVESTOR: "Referral partner", ADMIN: "Admin", SUBADMIN: "Admin" };
      return { error: `This account is registered as ${names[user.role] ?? user.role}. Please choose "${names[user.role] ?? user.role}" above to sign in.` };
    }
  }
  if (user && !user.passwordHash) {
    return { error: "This account has no password yet. Sign in with the one-time code instead." };
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
    } else if (user?.role === "OWNER") {
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
      expectedRole,
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
