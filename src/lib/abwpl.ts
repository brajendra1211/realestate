// Point ABWPL_BASE_URL at a relay (see cloudflare-worker/abwpl-proxy.js) when
// this host can't reach abwpl.com directly. The relay's own path convention
// is shorter for OTP (/send, /verify) than for template messages
// (/messages/send, /messages/templates) — url() below matches whichever
// base is active to the right suffix for each.
const ABWPL_RELAY_BASE = process.env.ABWPL_BASE_URL?.trim().replace(/\/+$/, "");
const ABWPL_DIRECT_BASE = "https://abwpl.com/api/public";
const ABWPL_API_KEY = process.env.ABWPL_API_KEY;
const ABWPL_PROXY_SECRET = process.env.ABWPL_PROXY_SECRET;

function abwplUrl(relayPath: string, directPath: string): string {
  return ABWPL_RELAY_BASE ? `${ABWPL_RELAY_BASE}${relayPath}` : `${ABWPL_DIRECT_BASE}${directPath}`;
}

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
    const response = await fetch(abwplUrl("/send", "/otp/send"), {
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
    const response = await fetch(abwplUrl("/verify", "/otp/verify"), {
      method: "POST",
      headers: abwplHeaders(),
      body: JSON.stringify({ phone, code }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export type AbwplTemplate = {
  name: string;
  status?: string;
  language?: string;
  category?: string;
  [key: string]: unknown;
};

// Lists templates approved for this WABA — use this to confirm a template
// name/parameter count before wiring a new notification to it, since
// sendAbwplTemplateMessage has no way to validate that itself.
export async function listAbwplTemplates(): Promise<AbwplTemplate[]> {
  if (!isAbwplConfigured()) return [];

  try {
    const response = await fetch(abwplUrl("/messages/templates", "/messages/templates"), {
      method: "GET",
      headers: abwplHeaders(),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : (data.templates ?? data.data ?? []);
  } catch {
    return [];
  }
}

// Template messages are the only way to send WhatsApp content this platform
// didn't just request (an OTP, say) — `templateName` must already be
// Meta-approved for this WABA, and `parameters` must match that template's
// placeholder count/order exactly, or abwpl rejects the send.
export async function sendAbwplTemplateMessage(
  phone: string,
  templateName: string,
  parameters: string[]
): Promise<boolean> {
  if (!isAbwplConfigured()) return false;

  try {
    const response = await fetch(abwplUrl("/messages/send", "/messages/send"), {
      method: "POST",
      headers: abwplHeaders(),
      body: JSON.stringify({ phone: toAbwplPhone(phone), templateName, parameters }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
