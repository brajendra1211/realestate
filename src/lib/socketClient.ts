"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

// One connection per browser tab, reused across every component that needs
// it (dispatch radar, agent lead widget, B2B chat) — same singleton idea as
// the server-side globalThis.__io in src/lib/socket.ts, just client-side.
export function getSocket(): Socket {
  if (!socket) {
    socket = io({ path: "/socket.io" });
  }
  return socket;
}
