// Custom server entry point for hosts (like cPanel/WHM's "Setup Node.js App"
// via Passenger) that need a plain Node.js file to start the app, rather than
// running `next start` directly. Passenger sets PORT and NODE_ENV itself.
//
// Also the ONLY place Socket.io can attach (it needs the raw http.Server
// instance, which `next dev`/`next start` don't expose to app code) — Phase 4
// dispatch/broadcast real-time (docs/platform-requirements.md §3.5/§3.6) only
// works when the app is launched through this file, not plain `next start`.
require("dotenv/config");
const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const httpServer = createServer((req, res) => {
  handle(req, res);
});

const io = new Server(httpServer, { path: "/socket.io" });

io.on("connection", (socket) => {
  // Clients join their own room right after connecting — see
  // src/components/useDispatchSocket.ts / useBroadcastSocket.ts, which emit
  // "join" with one of these keys immediately on mount.
  socket.on("join", (payload) => {
    if (payload?.agentProfileId) socket.join(`agent:${payload.agentProfileId}`);
    if (payload?.dispatchRequestId) socket.join(`dispatch:${payload.dispatchRequestId}`);
    if (payload?.broadcastId) socket.join(`broadcast:${payload.broadcastId}`);
    // Chat thread room name must match src/lib/socket.ts's chatThreadRoom()
    // exactly: sorted agent-pair key so join order never matters.
    if (payload?.chatBroadcastId && payload?.chatAgentAId && payload?.chatAgentBId) {
      const [a, b] = [payload.chatAgentAId, payload.chatAgentBId].sort();
      socket.join(`chat:${payload.chatBroadcastId}:${a}:${b}`);
    }
  });
});

// Set before app.prepare() so it's already available by the time Next's own
// instrumentation.ts (src/instrumentation.ts, starts the BullMQ worker) runs.
globalThis.__io = io;

app.prepare().then(() => {
  httpServer.listen(port, () => {
    console.log(`> Ready on port ${port} (${dev ? "development" : "production"})`);
  });
});
