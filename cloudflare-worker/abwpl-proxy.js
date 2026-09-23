// Relay for abwpl.com OTP calls. Deploy as a Cloudflare Worker and set a secret named PROXY_SECRET.
// Only POST /send and POST /verify are forwarded, and only when X-Proxy-Secret matches.
const UPSTREAM = "https://abwpl.com/api/public/otp";
const ALLOWED_PATHS = new Set(["/send", "/verify"]);

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (request.method !== "POST" || !ALLOWED_PATHS.has(pathname)) {
      return new Response("Not found", { status: 404 });
    }

    const secret = request.headers.get("X-Proxy-Secret");
    if (!env.PROXY_SECRET || secret !== env.PROXY_SECRET) {
      return new Response("Forbidden", { status: 403 });
    }

    const apiKey = request.headers.get("X-API-Key");
    if (!apiKey) return new Response("Missing API key", { status: 400 });

    const upstream = await fetch(`${UPSTREAM}${pathname}`, {
      method: "POST",
      headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
      body: await request.text(),
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
    });
  },
};
