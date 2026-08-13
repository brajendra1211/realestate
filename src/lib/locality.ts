import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { geocodeLocation } from "@/lib/geocode";

export async function uniqueLocalitySlug(name: string, cityId: string, ignoreId?: string) {
  const base = slugify(name) || "locality";
  let slug = base;
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.locality.findUnique({
      where: { cityId_slug: { cityId, slug } },
    });
    if (!existing || existing.id === ignoreId) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

// Used when a lister types a locality that isn't in the picker yet — created
// published so neither the locality nor their listing is held up. Admins and
// sub-admins may supply exact coordinates directly; everyone else gets them
// auto-detected via geocoding.
export async function findOrCreateLocality(
  name: string,
  cityId: string,
  manualCoords?: { latitude: number; longitude: number } | null
) {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const existing = await prisma.locality.findFirst({ where: { cityId, name: trimmed } });
  if (existing) return existing;

  const slug = await uniqueLocalitySlug(trimmed, cityId);

  let coords = manualCoords ?? null;
  if (!coords) {
    const city = await prisma.city.findUnique({
      where: { id: cityId },
      include: { state: { include: { country: true } } },
    });
    coords = city
      ? await geocodeLocation([trimmed, city.name, city.state.name, city.state.country.name].join(", "))
      : null;
  }

  return prisma.locality.create({
    data: {
      name: trimmed,
      slug,
      cityId,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      published: true,
    },
  });
}
