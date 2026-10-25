// One-off: adds "Study Room" and "Servant Room" to the admin-managed
// Amenity list (shared across both deployed sites) — not part of
// seed-production.ts's original 20 since they were requested afterward.
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma";
import { slugify } from "../src/lib/slug";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
const prisma = new PrismaClient({ adapter });

async function main() {
  const names = ["Study Room", "Servant Room"];
  const existingCount = await prisma.amenity.count();

  for (const [i, name] of names.entries()) {
    const slug = slugify(name);
    await prisma.amenity.upsert({
      where: { slug },
      update: {},
      create: { name, slug, order: existingCount + i },
    });
  }

  console.log("done:", names.join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
