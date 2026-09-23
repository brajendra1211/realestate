import { Queue, Worker } from "bullmq";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;
const QUEUE_NAME = "appointment-reminder";

// "Both get reminders" — §3.7. Fires this long before the scheduled visit.
export const REMINDER_LEAD_TIME_MS = 60 * 60 * 1000; // 1 hour

export function isReminderQueueConfigured() {
  return Boolean(REDIS_URL);
}

declare global {
  // eslint-disable-next-line no-var
  var __reminderQueue: Queue | undefined;
  // eslint-disable-next-line no-var
  var __reminderWorker: Worker | undefined;
}

function makeConnection() {
  return new Redis(REDIS_URL as string, { maxRetriesPerRequest: null });
}

export function getReminderQueue(): Queue | null {
  if (!REDIS_URL) return null;
  if (!globalThis.__reminderQueue) {
    globalThis.__reminderQueue = new Queue(QUEUE_NAME, { connection: makeConnection() });
  }
  return globalThis.__reminderQueue;
}

// Delay is computed from `scheduledAt` at call time — if the appointment is
// booked less than an hour out, the delay clamps to 0 (reminder fires
// almost immediately) rather than going negative.
export async function scheduleAppointmentReminder(appointmentId: string, scheduledAt: Date) {
  const queue = getReminderQueue();
  if (!queue) return;

  const delay = Math.max(0, scheduledAt.getTime() - REMINDER_LEAD_TIME_MS - Date.now());
  await queue.add(
    "send-reminder",
    { appointmentId },
    { delay, jobId: `reminder-${appointmentId}`, removeOnComplete: true, removeOnFail: true }
  );
}

export async function cancelAppointmentReminder(appointmentId: string) {
  const queue = getReminderQueue();
  if (!queue) return;
  const job = await queue.getJob(`reminder-${appointmentId}`);
  if (job) await job.remove();
}

// Started once at process startup (src/instrumentation.ts), same pattern as
// the dispatch-cascade worker.
export function startReminderWorker() {
  if (!REDIS_URL || globalThis.__reminderWorker) return;

  globalThis.__reminderWorker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { sendAppointmentReminder } = await import("@/lib/appointment");
      await sendAppointmentReminder(job.data.appointmentId);
    },
    { connection: makeConnection() }
  );

  globalThis.__reminderWorker.on("failed", (job, err) => {
    console.error(`Appointment reminder job ${job?.id} failed:`, err);
  });
}
