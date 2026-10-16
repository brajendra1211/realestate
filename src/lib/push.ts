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
export async function sendPushToUser(
  userId: string,
  notification: { title: string; body: string },
  data?: Record<string, string>
) {
  const fcm = await getMessaging();
  if (!fcm) return;

  const tokens: { id: string; token: string }[] = await prisma.pushToken.findMany({
    where: { userId },
    select: { id: true, token: true },
  });
  if (tokens.length === 0) return;

  const response = await fcm.sendEachForMulticast({
    tokens: tokens.map((t) => t.token),
    notification,
    data,
    android: {
      priority: "high",
      notification: { channelId: "shop_scan_alerts", sound: "ring_alert", priority: "max" },
    },
  });

  // Prune tokens Firebase reports as dead (uninstalled app, expired token,
  // etc.) — otherwise every future alert keeps retrying a token that will
  // never succeed again.
  const deadTokenIds = response.responses
    .map((r: { success: boolean }, i: number) => (!r.success ? tokens[i].id : null))
    .filter((id: string | null): id is string => id !== null);
  if (deadTokenIds.length > 0) {
    await prisma.pushToken.deleteMany({ where: { id: { in: deadTokenIds } } });
  }
}
