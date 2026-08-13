import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PropertyCard } from "@/components/PropertyCard";
import { SearchBar } from "@/components/SearchBar";
import { NearMeButton } from "@/components/NearMeButton";
import { JsonLd } from "@/components/JsonLd";
import { getSiteSettings } from "@/lib/site-settings";
import { PUBLIC_LISTER_FILTER, notExpiredFilter } from "@/lib/propertyVisibility";
import { getLocationCookie } from "@/lib/location-context";
import { SITE_URL } from "@/lib/seo";

export default async function Home() {
  const [settings, location] = await Promise.all([getSiteSettings(), getLocationCookie()]);

  let featuredProperties = await prisma.property.findMany({
    where: {
      approvalStatus: "APPROVED",
      status: "AVAILABLE",
      featured: true,
      owner: PUBLIC_LISTER_FILTER,
      ...notExpiredFilter(),
      ...(location ? { city: { contains: location.cityName } } : {}),
    },
    include: { images: { orderBy: { order: "asc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  // Fall back to city-wide featured properties if there's nothing featured yet in the selected city.
  if (location && featuredProperties.length === 0) {
    featuredProperties = await prisma.property.findMany({
      where: {
        approvalStatus: "APPROVED",
        status: "AVAILABLE",
        featured: true,
        owner: PUBLIC_LISTER_FILTER,
        ...notExpiredFilter(),
      },
      include: { images: { orderBy: { order: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 6,
    });
  }

  // Fall back to the latest listings if nothing has been marked featured yet,
  // so the homepage never looks empty while there are live listings.
  let usingLatestFallback = false;
  if (featuredProperties.length === 0) {
    usingLatestFallback = true;
    featuredProperties = await prisma.property.findMany({
      where: {
        approvalStatus: "APPROVED",
        status: "AVAILABLE",
        owner: PUBLIC_LISTER_FILTER,
        ...notExpiredFilter(),
        ...(location ? { city: { contains: location.cityName } } : {}),
      },
      include: { images: { orderBy: { order: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 6,
    });
  }

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.siteName,
    url: SITE_URL,
    logo: settings.logoUrl ? { "@type": "ImageObject", url: settings.logoUrl } : undefined,
    contactPoint: settings.contactPhone
      ? {
          "@type": "ContactPoint",
          telephone: settings.contactPhone,
          contactType: "customer service",
          email: settings.contactEmail ?? undefined,
        }
      : undefined,
    sameAs: [settings.instagramUrl, settings.facebookUrl, settings.youtubeUrl, settings.linkedinUrl].filter(
      Boolean
    ),
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.siteName,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/properties?city={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div>
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={websiteJsonLd} />
      <section
        className={`relative overflow-hidden bg-cover bg-center px-4 py-20 text-center text-white sm:px-6 ${
          settings.heroImage ? "" : "bg-gradient-to-b from-slate-900 to-slate-800"
        }`}
        style={settings.heroImage ? { backgroundImage: `url(${settings.heroImage})` } : undefined}
      >
        {settings.heroImage && <div className="absolute inset-0 bg-slate-900/55" />}
        <div className="relative">
          <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            {settings.heroTitle ?? "Find the right property, faster"}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">
            {settings.heroSubtitle ??
              "Buy, sell, and rent homes with verified agents across the city."}
          </p>
          <div className="mt-8">
            <SearchBar />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <NearMeButton />
            <Link
              href="/properties-in"
              className="text-sm font-medium text-slate-300 underline-offset-2 hover:text-white hover:underline"
            >
              Or browse by location
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">
            {usingLatestFallback ? "Latest properties" : "Featured properties"}
            {location ? ` in ${location.cityName}` : ""}
          </h2>
          <Link
            href={location ? `/properties?city=${encodeURIComponent(location.cityName)}` : "/properties"}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            View all
          </Link>
        </div>

        {featuredProperties.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
            No properties listed yet. Check back soon.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProperties.map((property) => (
              <PropertyCard key={property.slug} property={property} />
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-slate-200 bg-slate-50 px-4 py-14 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-slate-900">Are you an agent or owner?</h2>
        <p className="mx-auto mt-2 max-w-xl text-slate-600">
          List your properties on {settings.siteName} and reach buyers and tenants directly.
        </p>
        <Link
          href={settings.ctaLink ?? "/register"}
          className="mt-6 inline-block rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          {settings.ctaText ?? "List a property"}
        </Link>
      </section>
    </div>
  );
}
