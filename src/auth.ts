import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { verifyOtp, looksLikeEmail } from "@/lib/otp";

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
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
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
          : await prisma.user.findFirst({ where: { phone: identifier } });

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
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id as string;
        token.role = user.role as "ADMIN" | "SUBADMIN" | "OWNER" | "DEALER" | "BUYER";
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
