// Production-safe seed: creates the real admin account, a base amenities
// list, and default site settings — deliberately skips the demo
// dealer/owner/developer/project/sample-property records that prisma/seed.ts
// creates for local development.
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";
import { slugify } from "../src/lib/slug";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME ?? "Admin";

  if (!adminEmail || !adminPassword) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before running the production seed.");
  }
  if (adminPassword === "ChangeMe123!") {
    throw new Error("ADMIN_PASSWORD is still the placeholder value — set a real password in .env.");
  }

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      role: "ADMIN",
      verified: true,
    },
  });
  console.log(`Admin ready: ${admin.email}`);

  const basicAmenities = [
    "Swimming Pool",
    "Gym",
    "Club House",
    "Children's Play Area",
    "Landscaped Garden",
    "24x7 Security",
    "CCTV Surveillance",
    "Power Backup",
    "Car Parking",
    "Lift",
    "Piped Gas",
    "Rain Water Harvesting",
    "Indoor Games Room",
    "Jogging Track",
    "Amphitheatre",
    "Multipurpose Hall",
    "Intercom Facility",
    "Fire Safety",
    "Visitor Parking",
    "Water Supply 24x7",
  ];

  for (const [index, name] of basicAmenities.entries()) {
    await prisma.amenity.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { name, slug: slugify(name), order: index },
    });
  }
  console.log(`${basicAmenities.length} amenities ready`);

  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      contactEmail: adminEmail,
    },
  });
  console.log("Site settings ready — customize branding from /admin/settings");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
