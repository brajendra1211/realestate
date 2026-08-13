import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PropertyCard } from "@/components/PropertyCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { NearMeButton } from "@/components/NearMeButton";
import { absoluteUrl } from "@/lib/seo";
import { buildLocationMeta, buildKeywordLinks, MIN_LISTINGS_TO_INDEX } from "@/lib/location-seo";
import { PUBLIC_LISTER_FILTER, notExpiredFilter } from "@/lib/propertyVisibility";
import type { Prisma } from "@/generated/prisma/client";

type Params = Promise<{ citySlug: string; localitySlug: string }>;

async function getLocality(citySlug: string, localitySlug: string) {
  const city = await prisma.city.findUnique({
    where: { slug: citySlug },
    include: { state: { include: { country: true } } },
  });
  if (!city) return null;

  const locality = await prisma.locality.findUnique({
    where: { cityId_slug: { cityId: city.id, slug: localitySlug } },
  });
  if (!locality) return null;

  return { city, locality };
}

function propertyWhere(cityName: string, localityName: string): Prisma.PropertyWhereInput {
  return {
    approvalStatus: "APPROVED",
    status: "AVAILABLE",
    city: { contains: cityName },
    locality: { contains: localityName },
    owner: PUBLIC_LISTER_FILTER,
    ...notExpiredFilter(),
  };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { citySlug, localitySlug } = await params;
  const result = await getLocality(citySlug, localitySlug);
  if (!result || !result.locality.published) return {};
  const { city, locality } = result;

  const fullName = `${locality.name}, ${city.name}`;
  const { title, description } = buildLocationMeta({
    name: fullName,
    customTitle: locality.metaTitle,
    customDescription: locality.metaDescription,
  });
  const count = await prisma.property.count({ where: propertyWhere(city.name, locality.name) });

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/properties-in/${city.slug}/${locality.slug}`) },
    robots: count >= MIN_LISTINGS_TO_INDEX ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function LocalityPage({ params }: { params: Params }) {
  const { citySlug, localitySlug } = await params;
  const result = await getLocality(citySlug, localitySlug);
  if (!result || !result.locality.published) notFound();
  const { city, locality } = result;

  const properties = await prisma.property.findMany({
    where: propertyWhere(city.name, locality.name),
    include: { images: { orderBy: { order: "asc" }, take: 1 } },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: 24,
  });

  const fullName = `${locality.name}, ${city.name}`;
  const keywordLinks = buildKeywordLinks(fullName, city.name);

  let nearbySuggestions: { name: string; slug: string }[] = [];
  if (properties.length < MIN_LISTINGS_TO_INDEX) {
    nearbySuggestions = await prisma.locality.findMany({
      where: { cityId: city.id, published: true, id: { not: locality.id } },
      select: { name: true, slug: true },
      take: 5,
    });
  }

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: locality.metaTitle ?? `Property for Sale & Rent in ${fullName}`,
    description: locality.metaDescription ?? locality.description ?? undefined,
    url: absoluteUrl(`/properties-in/${city.slug}/${locality.slug}`),
  };

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Property by Location", href: "/properties-in" },
          { label: city.name, href: `/properties-in/${city.slug}` },
          { label: locality.name, href: `/properties-in/${city.slug}/${locality.slug}` },
        ]}
      />
      <JsonLd data={collectionJsonLd} />

      <div className="mx-auto max-w-6xl px-4 pb-10 pt-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Property for Sale &amp; Rent in {fullName}
            </h1>
            <p className="text-sm text-slate-500">
              {city.state.name}, {city.state.country.name}
            </p>
          </div>
          <NearMeButton className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50" />
        </div>

        {locality.description && (
          <p className="mt-3 max-w-3xl text-slate-600">{locality.description}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {keywordLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <h2 className="mt-8 text-lg font-semibold text-slate-900">
          {properties.length} properties found
        </h2>

        {properties.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
            <p>No properties found in {fullName} yet.</p>
            <p className="mt-3 text-sm">
              See all{" "}
              <Link href={`/properties-in/${city.slug}`} className="text-blue-600 hover:underline">
                properties in {city.name}
              </Link>
              {nearbySuggestions.length > 0 && (
                <>
                  {" "}
                  or try nearby:{" "}
                  {nearbySuggestions.map((sibling, index) => (
                    <span key={sibling.slug}>
                      <Link
                        href={`/properties-in/${city.slug}/${sibling.slug}`}
                        className="text-blue-600 hover:underline"
                      >
                        {sibling.name}
                      </Link>
                      {index < nearbySuggestions.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </>
              )}
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <PropertyCard key={property.slug} property={property} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
