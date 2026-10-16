import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAgentByCode } from "@/lib/agent";
import { findNearbyAgents } from "@/lib/agentGeo";
import { emitToAgent } from "@/lib/socket";
import { sendPushToUser } from "@/lib/push";
import { redis, isRedisConfigured } from "@/lib/redis";

const ALERT_RADIUS_KM = 0.5;
const MAX_PARTNERS_ALERTED = 25;
const COOLDOWN_SECONDS = 90;

// Public — fired right after a buyer's QR scan resolves (web and mobile),
// before/alongside opening the scanned partner's shop. Pings every other
// nearby Prime channel partner so they know a buyer is in their area, the
// same way the scanned partner's own shop already surfaced for the buyer.
export async function POST(request: Request, context: { params: Promise<{ agentCode: string }> }) {
  const { agentCode } = await context.params;
  const body = await request.json().catch(() => null);
  const latitude = Number(body?.latitude);
  const longitude = Number(body?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }

  const scannedAgent = await getAgentByCode(agentCode);
  if (!scannedAgent || !scannedAgent.agentCode) {
    return NextResponse.json({ error: "notFound" }, { status: 404 });
  }

  // Debounce repeat scans/reloads of the same partner's QR so nearby
  // partners aren't pinged every few seconds for the same buyer.
  const cooldownKey = `shop-scan-alert:${scannedAgent.agentCode}`;
  if (isRedisConfigured() && redis) {
    const set = await redis.set(cooldownKey, "1", "EX", COOLDOWN_SECONDS, "NX");
    if (set === null) return NextResponse.json({ alerted: 0, cooldown: true });
  }

  const nearby = await findNearbyAgents(latitude, longitude, ALERT_RADIUS_KM, MAX_PARTNERS_ALERTED, [
    scannedAgent.id,
  ]);
  if (nearby.length === 0) return NextResponse.json({ alerted: 0 });

  const partners = await prisma.agentProfile.findMany({
    where: { id: { in: nearby.map((n) => n.agentProfileId) } },
    select: { id: true, userId: true },
  });

  const payload = {
    scannedAgentCode: scannedAgent.agentCode,
    scannedAgentName: scannedAgent.user.name,
  };

  await Promise.all(
    partners.map(async (partner) => {
      const match = nearby.find((n) => n.agentProfileId === partner.id);
      emitToAgent(partner.id, "shop-scan:nearby", { ...payload, distanceKm: match?.distanceKm ?? null });
      await sendPushToUser(
        partner.userId,
        {
          title: "Buyer nearby",
          body: `A buyer just scanned ${scannedAgent.user.name}'s QR code near you.`,
        },
        payload
      );
    })
  );

  return NextResponse.json({ alerted: partners.length });
}
