// Next's dev-mode static-paths worker (used for every dynamic App Router
// page, e.g. /properties/[slug]) runs this module in its own forked process,
// which doesn't reliably inherit DATABASE_URL from the parent — even though
// server.js already loads dotenv for its own process. Loading it here too
// makes prisma init work no matter which process evaluates this module.
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma";
import { bumpModel } from "@/lib/liveVersion";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const WRITE_OPS = new Set([
  "create",
  "createMany",
  "createManyAndReturn",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "upsert",
  "delete",
  "deleteMany",
]);

function createPrismaClient() {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);
  const base = new PrismaClient({ adapter });

  // After every successful write, note which model changed. This is what lets open
  // dashboards refresh themselves (see src/lib/liveVersion.ts).
  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const result = await query(args);
          if (WRITE_OPS.has(operation)) bumpModel(model);
          return result;
        },
      },
    },
  }) as unknown as PrismaClient;
}

export const prisma = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
