// Next.js's official startup hook — runs once per server process, in both
// dev and prod, whether launched via `next dev`/`next start` or the custom
// server.js. Used to start every BullMQ worker exactly once: the dispatch-
// cascade batch/timeout queue (§3.5), the appointment-reminder queue (§3.7),
// the daily agent-digest queue (§3.2), and the Prime billing/renewal queue
// (§3.1).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startDispatchWorker } = await import("@/lib/queues/dispatchQueue");
  startDispatchWorker();

  const { startReminderWorker } = await import("@/lib/queues/reminderQueue");
  startReminderWorker();

  const { startDigestWorker, scheduleDailyDigest } = await import("@/lib/queues/digestQueue");
  startDigestWorker();
  await scheduleDailyDigest();

  const { startBillingWorker, scheduleDailyBillingCheck } = await import("@/lib/queues/billingQueue");
  startBillingWorker();
  await scheduleDailyBillingCheck();
}
