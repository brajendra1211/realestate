// One-off backfill: registration never saved shopLatitude/shopLongitude
// before the geocodeWithFallback fix in src/lib/agent.ts, so every agent
// registered before that fix has no shop location — meaning Dispatch, the
// nearby-partner QR ring alert, and any other shop-location feature can
// never match them. Safe to re-run any time: only touches rows that are
// still missing coordinates.
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma";
import { geocodeWithFallback } from "../src/lib/geocode";
import { reindexAllAgents } from "../src/lib/agentGeo";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
const prisma = new PrismaClient({ adapter });

async function main() {
  const agents = await prisma.agentProfile.findMany({
    where: { shopLatitude: null, shopAddress: { not: null } },
    select: { id: true, agentCode: true, shopAddress: true, city: true },
  });

  console.log(`${agents.length} agent(s) missing shop coordinates.`);

  let geocoded = 0;
  for (const agent of agents) {
    const coords = await geocodeWithFallback([agent.shopAddress, agent.city]);
    if (coords) {
      await prisma.agentProfile.update({
        where: { id: agent.id },
        data: { shopLatitude: coords.latitude, shopLongitude: coords.longitude },
      });
      geocoded += 1;
      console.log(`✓ ${agent.agentCode ?? agent.id} -> ${coords.latitude}, ${coords.longitude}`);
    } else {
      console.log(`✗ ${agent.agentCode ?? agent.id} — could not geocode "${agent.shopAddress}, ${agent.city}"`);
    }
  }

  console.log(`Done. ${geocoded}/${agents.length} geocoded.`);

  if (geocoded > 0) {
    const indexed = await reindexAllAgents();
    console.log(`Redis geo index rebuilt (${indexed} Prime agent(s) indexed).`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
