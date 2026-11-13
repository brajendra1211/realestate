// Relay for abwpl.com calls (OTP delivery + template messages). Deploy as a
// Cloudflare Worker and set a secret named PROXY_SECRET.
const UPSTREAM = "https://abwpl.com/api/public";
// path this worker accepts -> path on abwpl.com + required method
const ROUTES = {
  "/send": { upstreamPath: "/otp/send", method: "POST" },
  "/verify": { upstreamPath: "/otp/verify", method: "POST" },
  "/messages/templates": { upstreamPath: "/messages/templates", method: "GET" },
  "/messages/send": { upstreamPath: "/messages/send", method: "POST" },
};

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const route = ROUTES[pathname];

    if (!route || request.method !== route.method) {
      return new Response("Not found", { status: 404 });
    }

    const secret = request.headers.get("X-Proxy-Secret");
    if (!env.PROXY_SECRET || secret !== env.PROXY_SECRET) {
      return new Response("Forbidden", { status: 403 });
    }

    const apiKey = request.headers.get("X-API-Key");
    if (!apiKey) return new Response("Missing API key", { status: 400 });

    const upstream = await fetch(`${UPSTREAM}${route.upstreamPath}`, {
      method: route.method,
      headers:
        route.method === "POST"
          ? { "X-API-Key": apiKey, "Content-Type": "application/json" }
          : { "X-API-Key": apiKey },
      body: route.method === "POST" ? await request.text() : undefined,
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
    });
  },
};
