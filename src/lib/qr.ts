import QRCode from "qrcode";

export type QrOptions = {
  margin?: number;
  width?: number;
  color?: string;
  bgColor?: string;
  errorCorrectionLevel?: "L" | "M" | "Q" | "H";
};

/**
 * Returns the canonical public URL for an Agent's dedicated Digital Shop & Profile.
 */
export function getAgentShopUrl(agentCode: string, origin?: string): string {
  const base = (origin || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/shop/${encodeURIComponent(agentCode.trim())}`;
}

/**
 * Generates an ISO/IEC 18004 compliant SVG QR code string.
 * Real, scannable by any smartphone camera, Google Lens, or WhatsApp QR scanner.
 */
export async function generateQrSvg(text: string, options?: QrOptions): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    margin: options?.margin ?? 2,
    width: options?.width ?? 300,
    errorCorrectionLevel: options?.errorCorrectionLevel ?? "M",
    color: {
      dark: options?.color ?? "#0f172a",
      light: options?.bgColor ?? "#ffffff",
    },
  });
}

/**
 * Generates an ISO/IEC 18004 compliant PNG Data URL (base64) for use in <img> tags.
 * Real, scannable by any smartphone camera.
 */
export async function generateQrDataUrl(text: string, options?: QrOptions): Promise<string> {
  return QRCode.toDataURL(text, {
    margin: options?.margin ?? 2,
    width: options?.width ?? 360,
    errorCorrectionLevel: options?.errorCorrectionLevel ?? "M",
    color: {
      dark: options?.color ?? "#0f172a",
      light: options?.bgColor ?? "#ffffff",
    },
  });
}

/**
 * Generates a PNG binary Buffer for direct file downloads or image response streaming.
 */
export async function generateQrPngBuffer(text: string, options?: QrOptions): Promise<Buffer> {
  return QRCode.toBuffer(text, {
    type: "png",
    margin: options?.margin ?? 2,
    width: options?.width ?? 512,
    errorCorrectionLevel: options?.errorCorrectionLevel ?? "M",
    color: {
      dark: options?.color ?? "#0f172a",
      light: options?.bgColor ?? "#ffffff",
    },
  });
}
