/**
 * Delete every user except ADMIN accounts, but KEEP all properties.
 *
 *   npx tsx scripts/reset-users-keep-admin.ts            -> dry run, only prints what would happen
 *   npx tsx scripts/reset-users-keep-admin.ts --confirm  -> actually does it
 *
 * Optional env vars:
 *   KEEP_ADMIN_EMAIL="admin@pronesto.in"  which ADMIN takes ownership of the kept properties (default: admin@pronesto.in if it
 *                                    exists, otherwise the oldest ADMIN). All ADMIN accounts are kept either way.
 *   ADMIN_NEW_PASSWORD="..."         sets that password on that admin.
 *
 * What it does, in order:
 *  1. Website properties (Property) owned by deleted users are re-assigned to the kept admin,
 *     because Property.owner is ON DELETE CASCADE and they would otherwise be deleted.
 *  2. Partner marketplace listings (AgentListing) are detached from their agent (agentId -> null),
 *     for the same reason.
 *  3. Test rows that have no foreign key to a user (cart, watch-list, office visits, OTP codes) are cleared.
 *  4. All non-ADMIN users are deleted (their own data cascades: profiles, wallets, deals, enquiries ...).
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

const CONFIRM = process.argv.includes("--confirm");

async function main() {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, orderBy: { createdAt: "asc" } });
  if (admins.length === 0) throw new Error("No ADMIN user found. Refusing to delete anything.");
  const wanted = (process.env.KEEP_ADMIN_EMAIL ?? "admin@pronesto.in").toLowerCase();
  const keep = admins.find((a) => a.email?.toLowerCase() === wanted) ?? admins[0];

  const others = await prisma.user.count({ where: { role: { not: "ADMIN" } } });
  const [props, propsOwnedByOthers, listings, listingsWithAgent, agentProfiles] = await Promise.all([
    prisma.property.count(),
    prisma.property.count({ where: { ownerId: { not: keep.id } } }),
    prisma.agentListing.count(),
    prisma.agentListing.count({ where: { agentId: { not: null } } }),
    prisma.agentProfile.count(),
  ]);

  console.log("Database target:", (process.env.DATABASE_URL ?? "").replace(/:\/\/[^@]*@/, "://***@"));
  console.log("Admin(s) found:", admins.map((a) => `${a.email} (${a.role})`).join(", "));
  console.log("Admin kept:", keep.email);
  console.log("Users to delete:", others);
  console.log("Agent profiles (will be deleted):", agentProfiles);
  console.log(`Website properties: ${props} (${propsOwnedByOthers} will be re-assigned to the admin, all kept)`);
  console.log(`Agent listings: ${listings} (${listingsWithAgent} detached from their agent, all kept)`);

  if (!CONFIRM) {
    console.log("\nDRY RUN. Nothing was changed. Run again with --confirm to apply.");
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.property.updateMany({ where: { ownerId: { not: keep.id } }, data: { ownerId: keep.id } });
      await tx.agentListing.updateMany({ where: { agentId: { not: null } }, data: { agentId: null } });
      // Agents refer other agents (self-reference without cascade): clear before deleting them.
      await tx.agentProfile.updateMany({ where: { referringAgentId: { not: null } }, data: { referringAgentId: null } });
      // Investors require their referring agent (no cascade): remove them before the agents go.
      await tx.investorProfile.deleteMany({ where: { user: { role: { not: "ADMIN" } } } });
      await tx.cartItem.deleteMany({});
      await tx.cartShare.deleteMany({});
      await tx.watchRequirement.deleteMany({});
      await tx.officeVisitor.deleteMany({});
      await tx.agentOfficeVisit.deleteMany({});
      await tx.otpCode.deleteMany({});
      const del = await tx.user.deleteMany({ where: { role: { not: "ADMIN" } } });
      console.log("Deleted users:", del.count);
      const newPassword = process.env.ADMIN_NEW_PASSWORD;
      if (newPassword) {
        await tx.user.update({ where: { id: keep.id }, data: { passwordHash: await bcrypt.hash(newPassword, 10) } });
        console.log("Admin password updated for:", keep.email);
      }
    },
    { timeout: 120000 }
  );

  const [usersLeft, propsLeft, listingsLeft] = await Promise.all([
    prisma.user.count(),
    prisma.property.count(),
    prisma.agentListing.count(),
  ]);
  console.log(`Done. Users left: ${usersLeft}, properties: ${propsLeft}, agent listings: ${listingsLeft}`);
}

main()
  .catch((e) => {
    console.error("FAILED:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect().then(() => process.exit()));
