import { Queue, Worker } from "bullmq";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;
const QUEUE_NAME = "agent-digest";

// "Prime agents get a daily digest" — §3.2. 9am IST-ish; the exact hour
// isn't specified, so this is a reasonable default admin can change by
// editing this cron pattern.
const DIGEST_CRON = "0 9 * * *";

export function isDigestQueueConfigured() {
  return Boolean(REDIS_URL);
}

declare global {
  // eslint-disable-next-line no-var
  var __digestQueue: Queue | undefined;
  // eslint-disable-next-line no-var
  var __digestWorker: Worker | undefined;
}

function makeConnection() {
  return new Redis(REDIS_URL as string, { maxRetriesPerRequest: null });
}

export function getDigestQueue(): Queue | null {
  if (!REDIS_URL) return null;
  if (!globalThis.__digestQueue) {
    globalThis.__digestQueue = new Queue(QUEUE_NAME, { connection: makeConnection() });
  }
  return globalThis.__digestQueue;
}

// Registers the repeatable job scheduler — idempotent: `upsertJobScheduler`
// keys by `jobSchedulerId`, so calling this again on every server restart
// just confirms the same schedule rather than creating duplicates.
export async function scheduleDailyDigest() {
  const queue = getDigestQueue();
  if (!queue) return;
  await queue.upsertJobScheduler(
    "daily-digest",
    { pattern: DIGEST_CRON },
    { name: "send-digests", opts: { removeOnComplete: true, removeOnFail: true } }
  );
}

export function startDigestWorker() {
  if (!REDIS_URL || globalThis.__digestWorker) return;

  globalThis.__digestWorker = new Worker(
    QUEUE_NAME,
    async () => {
      const { sendDailyDigests } = await import("@/lib/digest");
      const sent = await sendDailyDigests();
      console.log(`Daily digest sent to ${sent} agent(s).`);
    },
    { connection: makeConnection() }
  );

  globalThis.__digestWorker.on("failed", (job, err) => {
    console.error(`Digest job ${job?.id} failed:`, err);
  });
}
