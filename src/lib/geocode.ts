// Reverse of geocodeLocation: lat/lng -> postal code, for the pincode-based
// area-routing override (src/lib/areaRouting.ts). Same Nominatim host/policy
// as the forward lookup above.
export async function reverseGeocodePincode(latitude: number, longitude: number): Promise<string | null> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "BayaEstate/1.0 (dispatch area routing)",
        Accept: "application/json",
      },
    });
    if (!response.ok) return null;

    const result = (await response.json()) as { address?: { postcode?: string } };
    return result.address?.postcode?.trim() || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function geocodeLocation(query: string): Promise<{ latitude: number; longitude: number } | null> {
  if (!query.trim()) return null;

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Required by Nominatim's usage policy: identify the app and a contact.
        "User-Agent": "BayaEstate/1.0 (admin location geocoding)",
        Accept: "application/json",
      },
    });
    if (!response.ok) return null;

    const results = (await response.json()) as Array<{ lat: string; lon: string }>;
    const first = results[0];
    if (!first) return null;

    const latitude = Number(first.lat);
    const longitude = Number(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return { latitude, longitude };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Nominatim rarely knows house/flat/shop-level addresses, so this tries the
// full address first, then falls back to progressively coarser parts (e.g.
// locality, then city) until one resolves — good enough for duplicate
// checks, area routing, and partner-location matching, even when the exact
// address never geocodes. Calls are spaced out to respect Nominatim's 1
// request/second usage policy. `parts` is ordered finest-to-coarsest, e.g.
// [exactAddress, locality, city].
export async function geocodeWithFallback(
  parts: (string | null | undefined)[]
): Promise<{ latitude: number; longitude: number } | null> {
  const clean = parts.map((p) => p?.trim()).filter((p): p is string => Boolean(p));
  const queries = [clean.join(", "), ...clean.slice(1).map((_, i) => clean.slice(i + 1).join(", "))].filter(
    (q, i, all) => q && all.indexOf(q) === i
  );

  for (const [index, query] of queries.entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, 1100));
    const coords = await geocodeLocation(query);
    if (coords) return coords;
  }
  return null;
}
