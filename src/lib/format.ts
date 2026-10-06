const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatPrice(price: number, listingType: "SALE" | "RENT") {
  const formatted = inrFormatter.format(price);
  return listingType === "RENT" ? `${formatted}/mo` : formatted;
}

export function formatIndianShortPrice(price: number, listingType?: "SALE" | "RENT"): string {
  if (listingType === "RENT") {
    if (price >= 100000) {
      return `₹ ${(price / 100000).toFixed(2).replace(/\.00$/, "")} Lac/mo`;
    }
    if (price >= 1000) {
      return `₹ ${(price / 1000).toFixed(0)} K/mo`;
    }
    return `₹ ${price}/mo`;
  }
  if (price >= 10000000) {
    const cr = (price / 10000000).toFixed(2);
    return `₹ ${cr.replace(/\.00$/, "")} Cr`;
  }
  if (price >= 100000) {
    const lac = (price / 100000).toFixed(2);
    return `₹ ${lac.replace(/\.00$/, "")} Lac`;
  }
  return `₹ ${price.toLocaleString("en-IN")}`;
}

export function formatINR(amount: number) {
  return inrFormatter.format(amount);
}

export function parseVideoUrls(raw?: string | null): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter((u) => u.startsWith("http"));
      }
    } catch {
      // fallback to split
    }
  }

  return trimmed
    .split(/[\n,\r\t]+/)
    .map((u) => u.trim())
    .filter((u) => u.length > 0 && (u.startsWith("http://") || u.startsWith("https://")));
}

export type VideoEmbedInfo = {
  originalUrl: string;
  embedUrl: string | null;
  type: "youtube" | "vimeo" | "direct" | "external";
  title?: string;
};

export function getYoutubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    let videoId: string | null = null;
    if (host === "youtu.be") {
      videoId = parsed.pathname.slice(1);
    } else if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname === "/watch") {
        videoId = parsed.searchParams.get("v");
      } else if (parsed.pathname.startsWith("/embed/")) {
        videoId = parsed.pathname.split("/embed/")[1];
      } else if (parsed.pathname.startsWith("/shorts/")) {
        videoId = parsed.pathname.split("/shorts/")[1];
      } else if (parsed.pathname.startsWith("/live/")) {
        videoId = parsed.pathname.split("/live/")[1];
      }
    }

    videoId = videoId?.split(/[?&]/)[0] || null;
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
}

export function getVideoEmbed(url: string): VideoEmbedInfo {
  const yt = getYoutubeEmbedUrl(url);
  if (yt) {
    return {
      originalUrl: url,
      embedUrl: yt,
      type: "youtube",
      title: "YouTube Video Tour",
    };
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host.includes("vimeo.com")) {
      const segments = parsed.pathname.split("/").filter(Boolean);
      const vimeoId = segments[segments.length - 1];
      if (vimeoId && /^\d+$/.test(vimeoId)) {
        return {
          originalUrl: url,
          embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
          type: "vimeo",
          title: "Vimeo Video Tour",
        };
      }
    }
    if (url.match(/\.(mp4|webm|ogg)($|\?)/i)) {
      return {
        originalUrl: url,
        embedUrl: url,
        type: "direct",
        title: "Video File",
      };
    }
  } catch {
    // ignore
  }

  return {
    originalUrl: url,
    embedUrl: null,
    type: "external",
    title: "External Video Link",
  };
}

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTMENT: "Apartment",
  VILLA: "Villa",
  INDEPENDENT_HOUSE: "Independent House",
  PLOT: "Plot",
  COMMERCIAL: "Commercial",
  OFFICE: "Office",
};

export const IMAGE_CATEGORY_LABELS: Record<string, string> = {
  EXTERIOR: "Exterior",
  LIVING_ROOM: "Living Room",
  BEDROOM: "Bedroom",
  KITCHEN: "Kitchen",
  BATHROOM: "Bathroom",
  DINING: "Dining",
  BALCONY: "Balcony",
  FLOOR_PLAN: "Floor Plan",
  OTHER: "Other",
};

export const IMAGE_CATEGORIES = Object.keys(IMAGE_CATEGORY_LABELS) as Array<
  keyof typeof IMAGE_CATEGORY_LABELS
>;

export const PAYMENT_MODE_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  CASH: "Cash",
  UPI: "UPI",
  NETBANKING: "Net Banking",
};

export const PAYMENT_MODES = Object.keys(PAYMENT_MODE_LABELS) as Array<
  keyof typeof PAYMENT_MODE_LABELS
>;
