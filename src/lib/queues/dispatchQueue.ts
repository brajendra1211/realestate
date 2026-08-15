import { Queue, Worker } from "bullmq";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;
const QUEUE_NAME = "dispatch-cascade";

// §3.5's "1-min accept timer" per batch before cascading to the next 5-10
// nearest agents.
export const BATCH_TIMEOUT_MS = 60_000;

export function isDispatchQueueConfigured() {
  return Boolean(REDIS_URL);
}

declare global {
  // eslint-disable-next-line no-var
  var __dispatchQueue: Queue | undefined;
  // eslint-disable-next-line no-var
  var __dispatchWorker: Worker | undefined;
}

// BullMQ wants a dedicated connection per Queue/Worker (it issues blocking
// commands internally) — deliberately not sharing src/lib/redis.ts's client.
function makeConnection() {
  return new Redis(REDIS_URL as string, { maxRetriesPerRequest: null });
}

export function getDispatchQueue(): Queue | null {
  if (!REDIS_URL) return null;
  if (!globalThis.__dispatchQueue) {
    globalThis.__dispatchQueue = new Queue(QUEUE_NAME, { connection: makeConnection() });
  }
  return globalThis.__dispatchQueue;
}

// jobId is deterministic (`<dispatchId>-<batch>`) so a re-schedule for the
// same batch is a no-op instead of a duplicate timer, and so
// cancelPendingBatchTimeout below can find it without keeping its own map.
// BullMQ rejects custom job IDs containing ":" (it uses colons for its own
// Redis key namespacing), so this can't just be a template string with one.
function batchJobId(dispatchRequestId: string, batch: number) {
  return `${dispatchRequestId}-${batch}`;
}

export async function scheduleBatchTimeout(dispatchRequestId: string, batch: number) {
  const queue = getDispatchQueue();
  if (!queue) return;
  await queue.add(
    "advance-batch",
    { dispatchRequestId, batch },
    {
      delay: BATCH_TIMEOUT_MS,
      jobId: batchJobId(dispatchRequestId, batch),
      removeOnComplete: true,
      removeOnFail: true,
    }
  );
}

export async function cancelPendingBatchTimeout(dispatchRequestId: string, batch: number) {
  const queue = getDispatchQueue();
  if (!queue) return;
  const job = await queue.getJob(batchJobId(dispatchRequestId, batch));
  if (job) await job.remove();
}

// Started once at process startup (src/instrumentation.ts). The processor
// dynamically imports src/lib/dispatch.ts rather than importing it at module
// scope — dispatch.ts calls scheduleBatchTimeout/cancelPendingBatchTimeout
// from this same file, so a top-level import here would create a cycle.
export function startDispatchWorker() {
  if (!REDIS_URL || globalThis.__dispatchWorker) return;

  globalThis.__dispatchWorker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { advanceDispatchBatch } = await import("@/lib/dispatch");
      await advanceDispatchBatch(job.data.dispatchRequestId, job.data.batch);
    },
    { connection: makeConnection() }
  );

  globalThis.__dispatchWorker.on("failed", (job, err) => {
    console.error(`Dispatch batch-advance job ${job?.id} failed:`, err);
  });
}
