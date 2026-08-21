// Next's dev-mode static-paths worker (used for every dynamic App Router
// page, e.g. /properties/[slug]) runs this module in its own forked process,
// which doesn't reliably inherit DATABASE_URL from the parent — even though
// server.js already loads dotenv for its own process. Loading it here too
// makes prisma init work no matter which process evaluates this module.
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
  return new PrismaClient({ adapter });
}

export const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
