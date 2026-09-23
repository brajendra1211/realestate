// Point ABWPL_BASE_URL at a relay (see cloudflare-worker/abwpl-proxy.js) when
// this host can't reach abwpl.com directly.
const ABWPL_BASE_URL = process.env.ABWPL_BASE_URL?.trim().replace(/\/+$/, "") || "https://abwpl.com/api/public/otp";
const ABWPL_API_KEY = process.env.ABWPL_API_KEY;
const ABWPL_PROXY_SECRET = process.env.ABWPL_PROXY_SECRET;

function abwplHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "X-API-Key": ABWPL_API_KEY as string,
    "Content-Type": "application/json",
  };
  if (ABWPL_PROXY_SECRET) headers["X-Proxy-Secret"] = ABWPL_PROXY_SECRET;
  return headers;
}

export function isAbwplConfigured(): boolean {
  return typeof ABWPL_API_KEY === "string" && ABWPL_API_KEY.trim().length > 0;
}

export function toAbwplPhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
}

// abwpl owns code generation and matching server-side — success/failure is
// communicated purely via HTTP status (2xx = correct code, non-2xx = wrong
// or expired code), no response body field to check.
export async function sendAbwplOtp(phone: string): Promise<boolean> {
  if (!isAbwplConfigured()) return false;

  try {
    const response = await fetch(`${ABWPL_BASE_URL}/send`, {
      method: "POST",
      headers: abwplHeaders(),
      body: JSON.stringify({ phone }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// abwpl owns code generation and matching server-side — success/failure is
// communicated purely via HTTP status (2xx = correct code, non-2xx = wrong
// or expired code), no response body field to check.
export async function verifyAbwplOtp(phone: string, code: string): Promise<boolean> {
  if (!isAbwplConfigured()) return false;

  try {
    const response = await fetch(`${ABWPL_BASE_URL}/verify`, {
      method: "POST",
      headers: abwplHeaders(),
      body: JSON.stringify({ phone, code }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
