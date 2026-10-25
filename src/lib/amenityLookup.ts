import { haversineDistanceKm } from "@/lib/geo";

// §3.15: "Nearby-amenity auto-tagging: given a flat's lat/long, auto-pull
// nearest Metro/Railway/Bus stand, Hospital, Grocery Market within 1/3/5 km
// — agent never types this manually." OpenStreetMap's Overpass API (free,
// no key) — same "no paid Google Maps key" posture as the existing
// Nominatim geocoding in src/lib/geocode.ts.
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const SEARCH_RADIUS_M = 5000; // covers the full "1/3/5 km" range in one query

type AmenityCategory =
  | "Metro/Railway"
  | "Bus Stand"
  | "Hospital"
  | "Grocery Market"
  | "School"
  | "Petrol Pump"
  | "Highway";

const CATEGORY_FILTERS: Record<AmenityCategory, string> = {
  "Metro/Railway": `node["railway"~"station|halt"]`,
  "Bus Stand": `node["amenity"="bus_station"]`,
  Hospital: `node["amenity"="hospital"]`,
  "Grocery Market": `node["shop"~"supermarket|convenience|grocery"]`,
  School: `node["amenity"="school"]`,
  "Petrol Pump": `node["amenity"="fuel"]`,
  // National/state highways in OSM are drawn as ways, not points — "trunk"
  // is OSM's tag for a National Highway in India, "primary" covers major
  // state highways. Needs `out center` below (ways have no lat/lon of
  // their own), unlike every other category here which is a plain node.
  Highway: `way["highway"~"trunk|primary"]`,
};

export type NearbyAmenity = {
  category: AmenityCategory;
  name: string;
  distanceKm: number;
};

type OverpassElement = {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: { name?: string; ref?: string; highway?: string; amenity?: string; shop?: string; railway?: string };
};

// Best-effort: returns [] on any failure (timeout, API down, no results)
// rather than blocking listing creation — this is an enrichment, not a
// required field.
export async function getNearbyAmenities(latitude: number, longitude: number): Promise<NearbyAmenity[]> {
  // `out center` (not `out body`) so way elements (Highway) come back with
  // a `center` point — plain node categories are unaffected, Overpass still
  // returns their own lat/lon directly.
  const query = `[out:json][timeout:10];(${Object.values(CATEGORY_FILTERS)
    .map((filter) => `${filter}(around:${SEARCH_RADIUS_M},${latitude},${longitude});`)
    .join("")});out center;`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // Overpass returns a bare 406 without these — same identification
        // requirement as Nominatim (src/lib/geocode.ts).
        Accept: "application/json, */*",
        "User-Agent": "BayaEstate/1.0 (nearby-amenity lookup)",
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    if (!response.ok) return [];

    const data = (await response.json()) as { elements?: OverpassElement[] };
    const elements = data.elements ?? [];

    const nearestByCategory = new Map<AmenityCategory, NearbyAmenity>();
    for (const [category, filter] of Object.entries(CATEGORY_FILTERS) as [AmenityCategory, string][]) {
      for (const el of elements) {
        if (!tagMatches(el, filter)) continue;
        const elLat = el.lat ?? el.center?.lat;
        const elLon = el.lon ?? el.center?.lon;
        if (elLat == null || elLon == null) continue;
        const distanceKm = haversineDistanceKm({ latitude, longitude }, { latitude: elLat, longitude: elLon });
        const existing = nearestByCategory.get(category);
        if (!existing || distanceKm < existing.distanceKm) {
          nearestByCategory.set(category, {
            category,
            name: (category === "Highway" ? el.tags?.ref : undefined) || el.tags?.name || category,
            distanceKm: Math.round(distanceKm * 10) / 10,
          });
        }
      }
    }

    return Array.from(nearestByCategory.values()).sort((a, b) => a.distanceKm - b.distanceKm);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

// Overpass returns one flat element list for the combined query — this
// re-derives which category-filter an element satisfies from its tags
// (cheaper than issuing 4 separate HTTP requests).
function tagMatches(el: OverpassElement, filter: string): boolean {
  const tags = (el as unknown as { tags?: Record<string, string> }).tags ?? {};
  if (filter.includes("railway")) return /station|halt/.test(tags.railway ?? "");
  if (filter.includes("bus_station")) return tags.amenity === "bus_station";
  if (filter.includes("hospital")) return tags.amenity === "hospital";
  if (filter.includes("shop")) return /supermarket|convenience|grocery/.test(tags.shop ?? "");
  if (filter.includes('amenity"="school"')) return tags.amenity === "school";
  if (filter.includes('amenity"="fuel"')) return tags.amenity === "fuel";
  if (filter.includes("highway")) return /trunk|primary/.test(tags.highway ?? "");
  return false;
}

export function formatAmenitiesNote(amenities: NearbyAmenity[]): string | null {
  if (amenities.length === 0) return null;
  return amenities.map((a) => `${a.category}: ${a.name} (${a.distanceKm}km)`).join(" | ");
}
