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

type Params = Promise<{ citySlug: string }>;

async function getCity(slug: string) {
  return prisma.city.findUnique({
    where: { slug },
    include: {
      state: { include: { country: true } },
      localities: { where: { published: true }, orderBy: { name: "asc" } },
    },
  });
}

async function getPropertyCount(cityName: string) {
  return prisma.property.count({
    where: {
      approvalStatus: "APPROVED",
      status: "AVAILABLE",
      city: { contains: cityName },
      owner: PUBLIC_LISTER_FILTER,
      ...notExpiredFilter(),
    },
  });
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { citySlug } = await params;
  const city = await getCity(citySlug);
  if (!city || !city.published) return {};

  const { title, description } = buildLocationMeta({
    name: city.name,
    customTitle: city.metaTitle,
    customDescription: city.metaDescription,
  });
  const count = await getPropertyCount(city.name);

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/properties-in/${city.slug}`) },
    robots: count >= MIN_LISTINGS_TO_INDEX ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function CityPage({ params }: { params: Params }) {
  const { citySlug } = await params;
  const city = await getCity(citySlug);
  if (!city || !city.published) notFound();

  const properties = await prisma.property.findMany({
    where: {
      approvalStatus: "APPROVED",
      status: "AVAILABLE",
      city: { contains: city.name },
      owner: PUBLIC_LISTER_FILTER,
      ...notExpiredFilter(),
    },
    include: { images: { orderBy: { order: "asc" }, take: 1 } },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: 24,
  });

  const projects = await prisma.project.findMany({
    where: { city: { contains: city.name } },
    take: 6,
    orderBy: { createdAt: "desc" },
  });

  const isThin = properties.length < MIN_LISTINGS_TO_INDEX;
  const keywordLinks = buildKeywordLinks(city.name, city.name);

  let nearbySuggestions: { name: string; slug: string }[] = [];
  if (isThin) {
    const siblings = await prisma.city.findMany({
      where: { stateId: city.stateId, published: true, id: { not: city.id } },
      select: { name: true, slug: true },
      take: 5,
    });
    nearbySuggestions = siblings;
  }

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: city.metaTitle ?? `Property for Sale & Rent in ${city.name}`,
    description: city.metaDescription ?? city.description ?? undefined,
    url: absoluteUrl(`/properties-in/${city.slug}`),
  };

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Property by Location", href: "/properties-in" },
          { label: city.name, href: `/properties-in/${city.slug}` },
        ]}
      />
      <JsonLd data={collectionJsonLd} />

      <div className="mx-auto max-w-6xl px-4 pb-10 pt-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Property for Sale &amp; Rent in {city.name}
            </h1>
            <p className="text-sm text-slate-500">
              {city.state.name}, {city.state.country.name}
            </p>
          </div>
          <NearMeButton className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50" />
        </div>

        {city.description && <p className="mt-3 max-w-3xl text-slate-600">{city.description}</p>}

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

        {city.localities.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900">Popular localities in {city.name}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {city.localities.map((locality) => (
                <Link
                  key={locality.id}
                  href={`/properties-in/${city.slug}/${locality.slug}`}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {locality.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        <h2 className="mt-8 text-lg font-semibold text-slate-900">
          {properties.length} properties found
        </h2>

        {properties.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
            <p>No properties found in {city.name} yet.</p>
            {nearbySuggestions.length > 0 && (
              <p className="mt-3 text-sm">
                Try nearby:{" "}
                {nearbySuggestions.map((sibling, index) => (
                  <span key={sibling.slug}>
                    <Link
                      href={`/properties-in/${sibling.slug}`}
                      className="text-blue-600 hover:underline"
                    >
                      {sibling.name}
                    </Link>
                    {index < nearbySuggestions.length - 1 ? ", " : ""}
                  </span>
                ))}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <PropertyCard key={property.slug} property={property} />
            ))}
          </div>
        )}

        {projects.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-semibold text-slate-900">New projects in {city.name}</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.slug}`}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {project.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
