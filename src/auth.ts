import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { verifyOtp, looksLikeEmail, phoneDigitsMatch } from "@/lib/otp";
import type { Role } from "@/generated/prisma";

async function findUserByPhone(identifier: string, role?: Role) {
  const candidates = await prisma.user.findMany({
    where: { phone: { not: null }, ...(role ? { role } : {}) },
  });
  return candidates.find((u) => phoneDigitsMatch(u.phone, identifier)) ?? null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const identifier = credentials?.email;
        const password = credentials?.password;
        if (typeof identifier !== "string" || typeof password !== "string") {
          return null;
        }

        const trimmed = identifier.trim();
        let user = null;

        if (looksLikeEmail(trimmed)) {
          user = await prisma.user.findUnique({ where: { email: trimmed.toLowerCase() } });
        } else {
          // Check by phone number
          user = await findUserByPhone(trimmed);

          // If not found by phone, check if it's an Agent Code (e.g. BP-1001)
          if (!user) {
            const agent = await prisma.agentProfile.findUnique({
              where: { agentCode: trimmed.toUpperCase() },
              include: { user: true },
            });
            if (agent?.user) {
              user = agent.user;
            }
          }

          // If still not found, check if it's an Investor Code (e.g. INV-1001)
          if (!user) {
            const investor = await prisma.investorProfile.findUnique({
              where: { investorCode: trimmed.toUpperCase() },
              include: { user: true },
            });
            if (investor?.user) {
              user = investor.user;
            }
          }
        }

        if (!user || !user.passwordHash) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    Credentials({
      id: "buyer-otp",
      name: "OTP",
      credentials: {
        identifier: { label: "Phone or email", type: "text" },
        otp: { label: "OTP", type: "text" },
      },
      authorize: async (credentials) => {
        const identifier = credentials?.identifier;
        const otp = credentials?.otp;
        if (typeof identifier !== "string" || typeof otp !== "string") {
          return null;
        }

        const valid = await verifyOtp(identifier, otp);
        if (!valid) return null;

        const isEmail = looksLikeEmail(identifier);
        const existing = isEmail
          ? await prisma.user.findUnique({ where: { email: identifier } })
          : await findUserByPhone(identifier);

        const user =
          existing ??
          (await prisma.user.create({
            data: {
              name: "Buyer",
              email: isEmail ? identifier : null,
              phone: isEmail ? null : identifier,
              role: "BUYER",
            },
          }));

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    Credentials({
      id: "investor-otp",
      name: "Referral Partner OTP",
      credentials: {
        identifier: { label: "Phone or email", type: "text" },
        otp: { label: "OTP", type: "text" },
      },
      authorize: async (credentials) => {
        const identifier = credentials?.identifier;
        const otp = credentials?.otp;
        if (typeof identifier !== "string" || typeof otp !== "string") {
          return null;
        }

        const valid = await verifyOtp(identifier, otp);
        if (!valid) return null;

        const isEmail = looksLikeEmail(identifier);
        // Unlike buyer-otp, this never auto-creates a user — an investor
        // account only exists once their referring agent has registered
        // them (docs/platform-requirements.md §3.11).
        const user = isEmail
          ? await prisma.user.findUnique({ where: { email: identifier } })
          : await findUserByPhone(identifier, "INVESTOR");

        if (!user || user.role !== "INVESTOR") return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    Credentials({
      id: "agent-otp",
      name: "Channel Partner OTP",
      credentials: {
        identifier: { label: "Phone or email", type: "text" },
        otp: { label: "OTP", type: "text" },
      },
      authorize: async (credentials) => {
        const identifier = credentials?.identifier;
        const otp = credentials?.otp;
        if (typeof identifier !== "string" || typeof otp !== "string") {
          return null;
        }

        const valid = await verifyOtp(identifier, otp);
        if (!valid) return null;

        // Never auto-creates a user — agents sign up through /api/agent/register.
        const user = looksLikeEmail(identifier)
          ? await prisma.user.findUnique({ where: { email: identifier } })
          : await findUserByPhone(identifier, "AGENT");

        if (!user || user.role !== "AGENT") return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id as string;
        token.role = user.role as
          | "ADMIN"
          | "SUBADMIN"
          | "OWNER"
          | "DEALER"
          | "BUYER"
          | "AGENT"
          | "INVESTOR";
      }
      return token;
    },
    session: ({ session, token }) => {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
});
