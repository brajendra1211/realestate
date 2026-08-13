export const MIN_LISTINGS_TO_INDEX = 1;

export function buildLocationMeta({
  name,
  customTitle,
  customDescription,
}: {
  name: string;
  customTitle?: string | null;
  customDescription?: string | null;
}) {
  const title = customTitle ?? `Property for Sale & Rent in ${name} — Flats, Houses & Plots`;
  const description =
    customDescription ??
    `Find flats, houses, and plots for sale and rent in ${name}. Verified listings from trusted dealers and owners, updated daily.`;
  return { title, description };
}

export function buildKeywordLinks(name: string, cityQuery: string) {
  return [
    { label: `Flats for Sale in ${name}`, href: `/properties?city=${encodeURIComponent(cityQuery)}&listingType=SALE&propertyType=APARTMENT` },
    { label: `Flats for Rent in ${name}`, href: `/properties?city=${encodeURIComponent(cityQuery)}&listingType=RENT&propertyType=APARTMENT` },
    { label: `Houses & Villas in ${name}`, href: `/properties?city=${encodeURIComponent(cityQuery)}&propertyType=VILLA` },
    { label: `Plots in ${name}`, href: `/properties?city=${encodeURIComponent(cityQuery)}&propertyType=PLOT` },
    { label: `Commercial Property in ${name}`, href: `/properties?city=${encodeURIComponent(cityQuery)}&propertyType=COMMERCIAL` },
  ];
}
