import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/password";

async function main() {
  const passwordHash = await hashPassword("Admin@123");

  // Upsert admin@pronesto.in
  const pronestoAdmin = await prisma.user.upsert({
    where: { email: "admin@pronesto.in" },
    update: {
      passwordHash,
      role: "ADMIN",
      name: "Pronesto Admin",
      verified: true,
    },
    create: {
      email: "admin@pronesto.in",
      name: "Pronesto Admin",
      passwordHash,
      role: "ADMIN",
      verified: true,
    },
  });
  console.log("Pronesto Admin ready:", pronestoAdmin.email);

  // Also ensure admin@bayaestate.com works with Admin@123 and ChangeMe123!
  await prisma.user.updateMany({
    where: { email: "admin@bayaestate.com" },
    data: { passwordHash, name: "Pronesto Admin", role: "ADMIN", verified: true },
  });
  console.log("bayaestate admin updated to Admin@123");

  // Also ensure admin@noidaprimeproperty.com works with Admin@123
  await prisma.user.updateMany({
    where: { email: "admin@noidaprimeproperty.com" },
    data: { passwordHash, role: "ADMIN", verified: true },
  });
  console.log("All admin passwords synced to: Admin@123");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

