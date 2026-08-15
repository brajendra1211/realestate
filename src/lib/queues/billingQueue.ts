import { Queue, Worker } from "bullmq";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;
const QUEUE_NAME = "prime-billing";

// §3.1's "monthly Prime subscription auto-debits" — checked daily so a
// renewal never sits more than 24h overdue. The exact hour isn't specified
// by the client; kept distinct from the digest job's hour so they don't
// contend for the same tick.
const BILLING_CRON = "0 3 * * *";

export function isBillingQueueConfigured() {
  return Boolean(REDIS_URL);
}

declare global {
  // eslint-disable-next-line no-var
  var __billingQueue: Queue | undefined;
  // eslint-disable-next-line no-var
  var __billingWorker: Worker | undefined;
}

function makeConnection() {
  return new Redis(REDIS_URL as string, { maxRetriesPerRequest: null });
}

export function getBillingQueue(): Queue | null {
  if (!REDIS_URL) return null;
  if (!globalThis.__billingQueue) {
    globalThis.__billingQueue = new Queue(QUEUE_NAME, { connection: makeConnection() });
  }
  return globalThis.__billingQueue;
}

export async function scheduleDailyBillingCheck() {
  const queue = getBillingQueue();
  if (!queue) return;
  await queue.upsertJobScheduler(
    "daily-billing-check",
    { pattern: BILLING_CRON },
    { name: "check-renewals", opts: { removeOnComplete: true, removeOnFail: true } }
  );
}

export function startBillingWorker() {
  if (!REDIS_URL || globalThis.__billingWorker) return;

  globalThis.__billingWorker = new Worker(
    QUEUE_NAME,
    async () => {
      const { checkAllPrimeRenewals } = await import("@/lib/billing");
      const { renewed, demoted } = await checkAllPrimeRenewals();
      console.log(`Prime billing check: ${renewed} renewed, ${demoted} demoted.`);
    },
    { connection: makeConnection() }
  );

  globalThis.__billingWorker.on("failed", (job, err) => {
    console.error(`Billing job ${job?.id} failed:`, err);
  });
}
