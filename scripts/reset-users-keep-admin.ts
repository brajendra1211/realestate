/**
 * Delete EVERY user except one admin, but KEEP all properties and listings.
 *
 *   npx tsx scripts/reset-users-keep-admin.ts            -> dry run, only prints what would happen
 *   npx tsx scripts/reset-users-keep-admin.ts --confirm  -> actually does it
 *
 * Env vars:
 *   KEEP_ADMIN_EMAIL="admin@pronesto.in"  the one admin that stays (default admin@pronesto.in). If no user has this
 *                                         email it is created as an ADMIN (then ADMIN_NEW_PASSWORD is required).
 *   ADMIN_NEW_PASSWORD="..."              sets this password on that admin (so local and server end up identical).
 *
 * What it does, in order:
 *  1. Website properties (Property) owned by deleted users are re-assigned to the kept admin,
 *     because Property.owner is ON DELETE CASCADE and they would otherwise be deleted.
 *  2. Partner marketplace listings (AgentListing) are detached from their agent (agentId -> null),
 *     for the same reason.
 *  3. Test rows that have no foreign key to a user (cart, watch-list, office visits, OTP codes) are cleared.
 *  4. Every other user (including other admins and sub-admins) is deleted; their own data cascades
 *     (profiles, wallets, deals, enquiries ...).
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

const CONFIRM = process.argv.includes("--confirm");

async function main() {
  const wanted = (process.env.KEEP_ADMIN_EMAIL ?? "admin@pronesto.in").trim().toLowerCase();
  const newPassword = process.env.ADMIN_NEW_PASSWORD;

  const existing = await prisma.user.findFirst({ where: { email: wanted } });
  if (existing && existing.role !== "ADMIN") {
    throw new Error(`${wanted} exists but is a ${existing.role}, not an ADMIN. Refusing to continue.`);
  }
  if (!existing && !newPassword) {
    throw new Error(`No user with email ${wanted}. Set ADMIN_NEW_PASSWORD so it can be created.`);
  }

  const total = await prisma.user.count();
  const otherAdmins = await prisma.user.findMany({
    where: { role: "ADMIN", ...(existing ? { id: { not: existing.id } } : {}) },
    select: { email: true },
  });
  const [props, listings, listingsWithAgent, agentProfiles] = await Promise.all([
    prisma.property.count(),
    prisma.agentListing.count(),
    prisma.agentListing.count({ where: { agentId: { not: null } } }),
    prisma.agentProfile.count(),
  ]);

  console.log("Database target:", (process.env.DATABASE_URL ?? "").replace(/:\/\/[^@]*@/, "://***@"));
  console.log("Admin that stays:", wanted, existing ? "(already exists)" : "(WILL BE CREATED)");
  console.log("Users in database now:", total);
  console.log("Other admins that will be deleted:", otherAdmins.map((a) => a.email).join(", ") || "none");
  console.log("Agent profiles (will be deleted):", agentProfiles);
  console.log(`Website properties: ${props} (all kept, owner becomes ${wanted})`);
  console.log(`Agent listings: ${listings} (all kept, ${listingsWithAgent} detached from their agent)`);

  if (!CONFIRM) {
    console.log("\nDRY RUN. Nothing was changed. Run again with --confirm to apply.");
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      let keepId = existing?.id;
      if (!keepId) {
        const created = await tx.user.create({
          data: {
            name: "Admin",
            email: wanted,
            role: "ADMIN",
            verified: true,
            passwordHash: await bcrypt.hash(newPassword as string, 10),
          },
        });
        keepId = created.id;
        console.log("Created admin:", wanted);
      }

      await tx.property.updateMany({ where: { ownerId: { not: keepId } }, data: { ownerId: keepId } });
      await tx.agentListing.updateMany({ where: { agentId: { not: null } }, data: { agentId: null } });
      // Agents refer other agents (self-reference without cascade): clear before deleting them.
      await tx.agentProfile.updateMany({ where: { referringAgentId: { not: null } }, data: { referringAgentId: null } });
      // Investors require their referring agent (no cascade): remove them before the agents go.
      await tx.investorProfile.deleteMany({ where: { userId: { not: keepId } } });
      await tx.cartItem.deleteMany({});
      await tx.cartShare.deleteMany({});
      await tx.watchRequirement.deleteMany({});
      await tx.officeVisitor.deleteMany({});
      await tx.agentOfficeVisit.deleteMany({});
      await tx.otpCode.deleteMany({});

      const del = await tx.user.deleteMany({ where: { id: { not: keepId } } });
      console.log("Deleted users:", del.count);

      if (newPassword) {
        await tx.user.update({ where: { id: keepId }, data: { passwordHash: await bcrypt.hash(newPassword, 10) } });
        console.log("Admin password set for:", wanted);
      }
    },
    { timeout: 120000 }
  );

  const [usersLeft, propsLeft, listingsLeft] = await Promise.all([
    prisma.user.findMany({ select: { email: true, role: true } }),
    prisma.property.count(),
    prisma.agentListing.count(),
  ]);
  console.log(`Done. Users left: ${usersLeft.map((u) => `${u.email} (${u.role})`).join(", ")}`);
  console.log(`Properties: ${propsLeft}, agent listings: ${listingsLeft}`);
}

main()
  .catch((e) => {
    console.error("FAILED:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect().then(() => process.exit()));
