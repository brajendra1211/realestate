import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notify";
import { findNearbyAgents } from "@/lib/agentGeo";
import { emitToAgent, emitToBroadcast, emitToChatThread } from "@/lib/socket";
import type { BroadcastTxnType } from "@/generated/prisma";

export class BroadcastServiceError extends Error {}

const NOTIFY_COUNT = 50; // "push card alert to every active agent in that radius" — no batching, one shot

export type CreateBroadcastInput = {
  radiusKm: number;
  society?: string | null;
  flatSize: string;
  txnType: BroadcastTxnType;
  budgetMin: number;
  budgetMax: number;
};

// Pure-dropdown B2B requirement broadcast — §3.6. Radius/society/flat
// size/transaction type/budget, no free text, pushed to every Prime agent
// within radius of the *posting* agent's shop.
export async function createBroadcast(agentProfileId: string, input: CreateBroadcastInput) {
  if (!input.flatSize.trim()) throw new BroadcastServiceError("validation");
  if (input.budgetMin > input.budgetMax) throw new BroadcastServiceError("validation");

  const agent = await prisma.agentProfile.findUnique({ where: { id: agentProfileId } });
  if (!agent) throw new BroadcastServiceError("notFound");
  if (agent.shopLatitude == null || agent.shopLongitude == null) {
    throw new BroadcastServiceError("noLocation");
  }

  const broadcast = await prisma.broadcast.create({
    data: {
      agentId: agentProfileId,
      latitude: agent.shopLatitude,
      longitude: agent.shopLongitude,
      radiusKm: input.radiusKm,
      society: input.society?.trim() || null,
      flatSize: input.flatSize.trim(),
      txnType: input.txnType,
      budgetMin: input.budgetMin,
      budgetMax: input.budgetMax,
    },
  });

  const nearby = await findNearbyAgents(
    agent.shopLatitude,
    agent.shopLongitude,
    input.radiusKm,
    NOTIFY_COUNT,
    [agentProfileId]
  );

  for (const nearbyAgent of nearby) {
    emitToAgent(nearbyAgent.agentProfileId, "broadcast:new", {
      broadcastId: broadcast.id,
      agentCode: agent.agentCode,
      society: broadcast.society,
      flatSize: broadcast.flatSize,
      txnType: broadcast.txnType,
      budgetMin: broadcast.budgetMin,
      budgetMax: broadcast.budgetMax,
    });
  }

  return broadcast;
}

// "Society (auto-populated for that radius)" — §3.6. Reuses MasterProperty's
// locality field (this app's closest existing concept to "society") within
// the chosen radius, so the dropdown is never manually typed.
export async function getSocietiesNearAgent(agentProfileId: string, radiusKm: number) {
  const agent = await prisma.agentProfile.findUnique({ where: { id: agentProfileId } });
  if (!agent?.shopLatitude || !agent?.shopLongitude) return [];

  const properties = await prisma.masterProperty.findMany({
    where: { city: agent.city ?? undefined, locality: { not: null } },
    select: { locality: true, latitude: true, longitude: true },
  });

  const { haversineDistanceKm } = await import("@/lib/geo");
  const localities = new Set<string>();
  for (const property of properties) {
    if (!property.locality) continue;
    const distanceKm = haversineDistanceKm(
      { latitude: agent.shopLatitude, longitude: agent.shopLongitude },
      { latitude: property.latitude, longitude: property.longitude }
    );
    if (distanceKm <= radiusKm) localities.add(property.locality);
  }
  return Array.from(localities).sort();
}

// "I Have This Property" — opens the Agent Code ↔ Agent Code chat.
// Idempotent: clicking twice doesn't create two response rows.
export async function respondToBroadcast(broadcastId: string, agentProfileId: string) {
  const broadcast = await prisma.broadcast.findUnique({
    where: { id: broadcastId },
    include: { agent: { include: { user: { select: { phone: true, email: true } } } } },
  });
  if (!broadcast) throw new BroadcastServiceError("notFound");
  if (broadcast.agentId === agentProfileId) throw new BroadcastServiceError("ownBroadcast");

  const response = await prisma.broadcastResponse.upsert({
    where: { broadcastId_agentId: { broadcastId, agentId: agentProfileId } },
    update: {},
    create: { broadcastId, agentId: agentProfileId },
  });

  emitToAgent(broadcast.agentId, "broadcast:response", { broadcastId, agentId: agentProfileId });
  emitToBroadcast(broadcastId, "broadcast:response", { broadcastId, agentId: agentProfileId });

  await notifyUser(
    broadcast.agent.user,
    `An agent responded "I Have This Property" to your ${broadcast.flatSize} ${broadcast.txnType.toLowerCase()} requirement. Open the chat to negotiate.`,
    "Broadcast response — chat opened"
  );

  return response;
}

export async function sendAgentChatMessage(
  broadcastId: string,
  fromAgentId: string,
  toAgentId: string,
  message: string
) {
  if (!message.trim()) throw new BroadcastServiceError("validation");

  const broadcast = await prisma.broadcast.findUnique({ where: { id: broadcastId } });
  if (!broadcast) throw new BroadcastServiceError("notFound");

  // Only the posting agent and an agent who has responded may chat on this
  // broadcast — keeps the thread scoped to a real negotiation, not open DM.
  const participants = new Set([broadcast.agentId]);
  const responses = await prisma.broadcastResponse.findMany({
    where: { broadcastId },
    select: { agentId: true },
  });
  responses.forEach((r) => participants.add(r.agentId));
  if (!participants.has(fromAgentId) || !participants.has(toAgentId)) {
    throw new BroadcastServiceError("notParticipant");
  }

  const chatMessage = await prisma.agentChatMessage.create({
    data: { broadcastId, fromAgentId, toAgentId, message: message.trim() },
  });

  // Notification badge (any page) + the live thread itself (if open).
  emitToAgent(toAgentId, "chat:notification", { broadcastId, fromAgentId });
  emitToChatThread(broadcastId, fromAgentId, toAgentId, "chat:message", chatMessage);

  return chatMessage;
}

export async function getChatThread(broadcastId: string, agentAId: string, agentBId: string) {
  return prisma.agentChatMessage.findMany({
    where: {
      broadcastId,
      OR: [
        { fromAgentId: agentAId, toAgentId: agentBId },
        { fromAgentId: agentBId, toAgentId: agentAId },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
}

// Live radius query, not a persisted notification list — a broadcast is a
// one-shot push (no batch/cascade state to track), unlike dispatch.
export async function getBroadcastsForAgent(agentProfileId: string) {
  const agent = await prisma.agentProfile.findUnique({ where: { id: agentProfileId } });
  if (!agent?.shopLatitude || !agent?.shopLongitude) return [];

  const { haversineDistanceKm } = await import("@/lib/geo");
  const broadcasts = await prisma.broadcast.findMany({
    where: { status: "OPEN", agentId: { not: agentProfileId } },
    include: { agent: { select: { agentCode: true } }, responses: { select: { agentId: true } } },
    orderBy: { createdAt: "desc" },
  });

  return broadcasts
    .map((b) => ({
      ...b,
      distanceKm: haversineDistanceKm(
        { latitude: agent.shopLatitude!, longitude: agent.shopLongitude! },
        { latitude: b.latitude, longitude: b.longitude }
      ),
    }))
    .filter((b) => b.distanceKm <= b.radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export async function getOwnBroadcasts(agentProfileId: string) {
  return prisma.broadcast.findMany({
    where: { agentId: agentProfileId },
    include: {
      responses: { include: { agent: { select: { agentCode: true, user: { select: { name: true } } } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function closeBroadcast(broadcastId: string, agentProfileId: string) {
  const result = await prisma.broadcast.updateMany({
    where: { id: broadcastId, agentId: agentProfileId },
    data: { status: "CLOSED" },
  });
  if (result.count === 0) throw new BroadcastServiceError("notFound");
}
