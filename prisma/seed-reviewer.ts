import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

// Demo accounts for the Apple App Store / Google Play reviewers (they can't receive an OTP, so they sign in
// with email + password). Safe to re-run: it also resets their password.
//   REVIEWER_PASSWORD='something-strong' npx tsx prisma/seed-reviewer.ts
const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = process.env.REVIEWER_PASSWORD;
  if (!password || password.length < 8) throw new Error("Set REVIEWER_PASSWORD (at least 8 characters).");
  const passwordHash = await hashPassword(password);
  const now = new Date();

  const accounts = [
    { email: "review-buyer@pronesto.in", name: "Review Buyer", role: "BUYER" as const, phone: "9000000101" },
    { email: "review-owner@pronesto.in", name: "Review Owner", role: "OWNER" as const, phone: "9000000102" },
    { email: "review-partner@pronesto.in", name: "Review Partner", role: "AGENT" as const, phone: "9000000103" },
  ];

  for (const a of accounts) {
    const user = await prisma.user.upsert({
      where: { email: a.email },
      update: { passwordHash, verified: true, termsAcceptedAt: now },
      create: { name: a.name, email: a.email, phone: a.phone, role: a.role, passwordHash, verified: true, termsAcceptedAt: now },
    });
    if (a.role === "AGENT") {
      await prisma.agentProfile.upsert({
        where: { userId: user.id },
        update: { status: "APPROVED", primeStatus: true },
        create: {
          userId: user.id,
          agentCode: "REVIEW-PARTNER",
          city: "Noida",
          shopName: "Review Partner Realty",
          shopAddress: "Sector 18, Noida",
          shopLatitude: 28.5707,
          shopLongitude: 77.3219,
          status: "APPROVED",
          primeStatus: true,
          verifiedAt: now,
        },
      });
    }
    console.log(`Ready: ${a.role.padEnd(6)} ${a.email}`);
  }
  console.log("\nGive these to the reviewer in App Store Connect > App Review Information (password = REVIEWER_PASSWORD).");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
