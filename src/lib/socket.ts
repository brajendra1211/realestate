import type { Server as SocketIOServer } from "socket.io";

declare global {
  // eslint-disable-next-line no-var
  var __io: SocketIOServer | undefined;
}

// server.js creates the actual Socket.io server (it needs the raw HTTP
// server instance, which only exists in the custom-server entry point) and
// sets globalThis.__io once at startup. Next.js API routes / Server Actions
// run in the same Node process when using a custom server, so they can reach
// it through this getter — same global-singleton pattern as src/lib/prisma.ts.
export function getIO(): SocketIOServer | null {
  return globalThis.__io ?? null;
}

// Every dispatch/broadcast event an agent or buyer can receive. Rooms:
// `agent:<agentProfileId>` (per-agent), `dispatch:<dispatchRequestId>` (the
// buyer watching one dispatch's live status), `broadcast:<broadcastId>` (agents
// watching one B2B requirement's responses).
export function emitToAgent(agentProfileId: string, event: string, payload: unknown) {
  getIO()?.to(`agent:${agentProfileId}`).emit(event, payload);
}

export function emitToDispatch(dispatchRequestId: string, event: string, payload: unknown) {
  getIO()?.to(`dispatch:${dispatchRequestId}`).emit(event, payload);
}

export function emitToBroadcast(broadcastId: string, event: string, payload: unknown) {
  getIO()?.to(`broadcast:${broadcastId}`).emit(event, payload);
}

// A chat thread is scoped to one broadcast AND one agent pair — several
// agents can each be negotiating the same broadcast independently, so a
// plain `broadcast:<id>` room would leak one pair's messages to another's
// open thread. Sorting the two agent IDs makes the room name order-independent.
export function chatThreadRoom(broadcastId: string, agentAId: string, agentBId: string) {
  const [a, b] = [agentAId, agentBId].sort();
  return `chat:${broadcastId}:${a}:${b}`;
}

export function emitToChatThread(
  broadcastId: string,
  agentAId: string,
  agentBId: string,
  event: string,
  payload: unknown
) {
  getIO()?.to(chatThreadRoom(broadcastId, agentAId, agentBId)).emit(event, payload);
}
