const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatPrice(price: number, listingType: "SALE" | "RENT") {
  const formatted = inrFormatter.format(price);
  return listingType === "RENT" ? `${formatted}/mo` : formatted;
}

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
      }
    }

    videoId = videoId?.split(/[?&]/)[0] || null;
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
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
