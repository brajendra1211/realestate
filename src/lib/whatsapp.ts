const API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const OTP_TEMPLATE_NAME = process.env.WHATSAPP_OTP_TEMPLATE_NAME;

export function isWhatsAppConfigured() {
  return Boolean(PHONE_NUMBER_ID && ACCESS_TOKEN);
}

// India-first normalization: bare 10-digit numbers get a +91 prefix. Anything
// already carrying a country code (leading +, or 11+ digits) is left as-is.
export function normalizePhone(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  if (phone.trim().startsWith("+")) return digits;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

async function callWhatsAppApi(body: Record<string, unknown>) {
  if (!isWhatsAppConfigured()) return false;

  try {
    const response = await fetch(
      `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

export async function sendWhatsAppText(to: string, message: string) {
  return callWhatsAppApi({
    to: normalizePhone(to),
    type: "text",
    text: { body: message },
  });
}

// Business-initiated messages (like OTPs to someone who hasn't messaged you in
// the last 24h) require an approved template — free-form text silently fails
// outside that window. Falls back to plain text if no template is configured.
export async function sendWhatsAppOtp(to: string, code: string) {
  if (!OTP_TEMPLATE_NAME) {
    return sendWhatsAppText(to, `Your BayaEstate login code is ${code}. It expires in 10 minutes.`);
  }

  return callWhatsAppApi({
    to: normalizePhone(to),
    type: "template",
    template: {
      name: OTP_TEMPLATE_NAME,
      language: { code: "en" },
      components: [
        { type: "body", parameters: [{ type: "text", text: code }] },
        {
          type: "button",
          sub_type: "url",
          index: "0",
          parameters: [{ type: "text", text: code }],
        },
      ],
    },
  });
}
