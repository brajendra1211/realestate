import { prisma } from "@/lib/prisma";

// Lazily-initialized singleton, same pattern as src/lib/redis.ts — avoids
// crashing module load when Firebase env vars aren't set yet (dev, or before
// the one-time Firebase project setup is done).
let messaging: import("firebase-admin/messaging").Messaging | null | undefined;

export function isPushConfigured() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY
  );
}

async function getMessaging() {
  if (messaging !== undefined) return messaging;
  if (!isPushConfigured()) {
    messaging = null;
    return messaging;
  }

  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getMessaging: getMessagingInstance } = await import("firebase-admin/messaging");

  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // .env stores the key with literal "\n" escapes.
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });

  messaging = getMessagingInstance(app);
  return messaging;
}

// Rings every device a user (so far, only channel partners) is logged in on.
// Silently no-ops if push isn't configured — callers don't need to check
// isPushConfigured() themselves, same convention as sendWhatsAppText/sendEmail.
const REALTIME_TYPES = ["listing-request", "buyer-interest", "property-ring"];

export async function sendPushToUser(
  userId: string,
  notification: { title: string; body: string },
  data?: Record<string, string>
) {
  const fcm = await getMessaging();
  if (!fcm) return { reason: "not-configured" as const };

  const tokens: { id: string; token: string; platform: string }[] = await prisma.pushToken.findMany({
    where: { userId },
    select: { id: true, token: true, platform: true },
  });
  if (tokens.length === 0) return { reason: "no-tokens" as const };

  // Data-only (no top-level `notification` field): Android's FCM SDK would
  // otherwise auto-display a notification-shaped message itself whenever the
  // app is backgrounded, bypassing the Dart background handler's *display*
  // logic — which means no fullScreenIntent, no custom category, no payload
  // threaded through to the tap handler. A data-only message always routes
  // through our own handler, foreground, background, or killed alike, so we
  // keep full control every time.
  const realtime = REALTIME_TYPES.includes(data?.type ?? "");
  const androidTokens = tokens.filter((t) => t.platform !== "IOS");
  const iosTokens = tokens.filter((t) => t.platform === "IOS");
  const payloadData = { ...data, title: notification.title, body: notification.body };

  // iPhones: iOS only shows a push while the app is closed when it carries a normal `notification` (alert) part,
  // so these go out as visible notifications with the high-priority APNs headers. Buzzers expire after a minute.
  const sends: Promise<import("firebase-admin/messaging").BatchResponse>[] = [];
  const order: typeof tokens[] = [];
  if (androidTokens.length > 0) {
    order.push(androidTokens);
    sends.push(
      fcm.sendEachForMulticast({
        tokens: androidTokens.map((t) => t.token),
        data: payloadData,
        android: { priority: "high", ...(realtime ? { ttl: 60 * 1000 } : {}) },
      }),
    );
  }
  if (iosTokens.length > 0) {
    order.push(iosTokens);
    sends.push(
      fcm.sendEachForMulticast({
        tokens: iosTokens.map((t) => t.token),
        notification: { title: notification.title, body: notification.body },
        data: payloadData,
        apns: {
          headers: { "apns-priority": "10", ...(realtime ? { "apns-expiration": String(Math.floor(Date.now() / 1000) + 60) } : {}) },
          payload: { aps: { sound: "default", "interruption-level": realtime ? "time-sensitive" : "active" } },
        },
      }),
    );
  }
  const results = await Promise.all(sends);
  const flat = results.flatMap((res, gi) => res.responses.map((r, i) => ({ r, token: order[gi][i] })));
  const response = {
    successCount: results.reduce((n, x) => n + x.successCount, 0),
    failureCount: results.reduce((n, x) => n + x.failureCount, 0),
    responses: flat.map((x) => x.r),
  };
  const sentTokens = flat.map((x) => x.token);

  // Prune tokens Firebase reports as dead (uninstalled app, expired token,
  // etc.) — otherwise every future alert keeps retrying a token that will
  // never succeed again.
  const deadTokenIds = response.responses
    .map((r: { success: boolean }, i: number) => (!r.success ? sentTokens[i].id : null))
    .filter((id: string | null): id is string => id !== null);
  if (deadTokenIds.length > 0) {
    await prisma.pushToken.deleteMany({ where: { id: { in: deadTokenIds } } });
  }

  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
    errors: response.responses
      .map((r: { success: boolean; error?: { code?: string; message?: string } }) =>
        r.success ? null : { code: r.error?.code, message: r.error?.message }
      )
      .filter(Boolean),
  };
}
