import { cookies } from "next/headers";

export const LOCATION_COOKIE = "baya_location";

export type LocationCookieValue = {
  citySlug: string;
  cityName: string;
  localitySlug: string | null;
  localityName: string | null;
};

export async function getLocationCookie(): Promise<LocationCookieValue | null> {
  const store = await cookies();
  const raw = store.get(LOCATION_COOKIE)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.citySlug !== "string" || typeof parsed.cityName !== "string") return null;
    return {
      citySlug: parsed.citySlug,
      cityName: parsed.cityName,
      localitySlug: typeof parsed.localitySlug === "string" ? parsed.localitySlug : null,
      localityName: typeof parsed.localityName === "string" ? parsed.localityName : null,
    };
  } catch {
    return null;
  }
}
