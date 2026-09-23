import Redis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined;
}

const REDIS_URL = process.env.REDIS_URL;

export function isRedisConfigured() {
  return Boolean(REDIS_URL);
}

// Shared connection, same singleton pattern as src/lib/prisma.ts. BullMQ needs
// its own dedicated connections per Queue/Worker (it manages blocking
// commands internally), so this one is for direct commands only — the Redis
// Geo agent index (src/lib/agentGeo.ts) and anything else that just needs
// GET/SET/GEOADD/GEOSEARCH.
function createRedisClient() {
  if (!REDIS_URL) return undefined;
  return new Redis(REDIS_URL, { maxRetriesPerRequest: null });
}

export const redis = globalThis.__redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production" && redis) {
  globalThis.__redis = redis;
}
