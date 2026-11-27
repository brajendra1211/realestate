import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

// Lists the admin accounts. To set a new password:
//   NEW_PASSWORD='something-strong' npx tsx prisma/reset-admin-password.ts            (the only / first admin)
//   NEW_PASSWORD='something-strong' TARGET_EMAIL='admin@x.com' npx tsx prisma/reset-admin-password.ts
const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
const prisma = new PrismaClient({ adapter });

async function main() {
  const admins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SUBADMIN"] } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { createdAt: "asc" },
  });
  console.log("Admin accounts:");
  for (const a of admins) console.log(`  ${a.role}  ${a.email}  (${a.name})`);

  const password = process.env.NEW_PASSWORD;
  if (!password) {
    console.log("\nNo NEW_PASSWORD given, nothing changed.");
    return;
  }
  if (password.length < 8) throw new Error("NEW_PASSWORD must be at least 8 characters.");

  const target = process.env.TARGET_EMAIL
    ? admins.find((a) => a.email?.toLowerCase() === process.env.TARGET_EMAIL!.toLowerCase())
    : admins.find((a) => a.role === "ADMIN");
  if (!target) throw new Error("No matching admin account found.");

  await prisma.user.update({ where: { id: target.id }, data: { passwordHash: await hashPassword(password) } });
  console.log(`\nPassword updated for ${target.email}. Log in with that email and the new password.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
