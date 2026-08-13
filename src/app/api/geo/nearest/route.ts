import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { haversineDistanceKm } from "@/lib/geo";

// If the closest known city is farther than this, we don't have real coverage
// there yet — better to report "not found" than silently mismatch someone to
// a city hundreds of km away because it happened to be the least-wrong option.
const MAX_MATCH_DISTANCE_KM = 100;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Missing or invalid lat/lng" }, { status: 400 });
  }

  const cities = await prisma.city.findMany({
    where: { published: true, latitude: { not: null }, longitude: { not: null } },
    select: { slug: true, name: true, latitude: true, longitude: true },
  });

  if (cities.length === 0) {
    return NextResponse.json({ error: "No locations available" }, { status: 404 });
  }

  const nearestCity = cities.reduce((closest, city) => {
    const distance = haversineDistanceKm(
      { latitude: lat, longitude: lng },
      { latitude: city.latitude as number, longitude: city.longitude as number }
    );
    return distance < closest.distance ? { city, distance } : closest;
  }, { city: cities[0], distance: Infinity });

  if (nearestCity.distance > MAX_MATCH_DISTANCE_KM) {
    return NextResponse.json({ error: "No nearby locations available" }, { status: 404 });
  }

  const localities = await prisma.locality.findMany({
    where: {
      published: true,
      latitude: { not: null },
      longitude: { not: null },
      city: { slug: nearestCity.city.slug },
    },
    select: { slug: true, name: true, latitude: true, longitude: true },
  });

  let nearestLocality: { slug: string; name: string } | null = null;
  if (localities.length > 0) {
    const best = localities.reduce(
      (closest, locality) => {
        const distance = haversineDistanceKm(
          { latitude: lat, longitude: lng },
          { latitude: locality.latitude as number, longitude: locality.longitude as number }
        );
        return distance < closest.distance ? { locality, distance } : closest;
      },
      { locality: localities[0], distance: Infinity }
    );
    nearestLocality = best.locality;
  }

  return NextResponse.json({
    citySlug: nearestCity.city.slug,
    cityName: nearestCity.city.name,
    localitySlug: nearestLocality?.slug ?? null,
    localityName: nearestLocality?.name ?? null,
  });
}
