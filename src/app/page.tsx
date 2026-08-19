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

const FEATURES = [
  {
    title: "Verified agents only",
    body: "Every agent is document-verified and Prime-activated before they can accept a lead.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  },
  {
    title: "Live agent dispatch",
    body: "Request a visit and get matched with the nearest available agent in real time — no waiting.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
    ),
  },
  {
    title: "No duplicate listings",
    body: "Every property is deduplicated against a shared master registry, so you never see the same flat twice.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-5 9l2 2 4-4" />
    ),
  },
  {
    title: "Ranked on real activity",
    body: "The agent leaderboard is computed live from deals and ratings — not editorial picks.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 2l2.6 6.5L21 9l-5 4.5L17.5 21 12 17.5 6.5 21 8 13.5 3 9l6.4-.5z" />
    ),
  },
];

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

  const [propertyCount, agentCount, cityCount] = await Promise.all([
    prisma.property.count({
      where: { approvalStatus: "APPROVED", status: "AVAILABLE", owner: PUBLIC_LISTER_FILTER, ...notExpiredFilter() },
    }),
    prisma.agentProfile.count({ where: { primeStatus: true } }),
    prisma.city.count({ where: { published: true } }),
  ]);

  const stats = [
    { label: "Live properties", value: propertyCount },
    { label: "Verified Prime agents", value: agentCount },
    { label: "Cities covered", value: cityCount },
  ];

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
        className="relative overflow-hidden bg-cover bg-center bg-linear-to-br from-blue-50 via-white to-indigo-50 px-4 py-24 text-center sm:px-6"
        style={settings.heroImage ? { backgroundImage: `url(${settings.heroImage})` } : undefined}
      >
        {settings.heroImage && <div className="absolute inset-0 bg-white/85" />}

        {!settings.heroImage && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="animate-blob absolute -left-24 -top-24 h-96 w-96 rounded-full bg-blue-300/30 blur-3xl" />
            <div className="animate-blob animation-delay-2000 absolute -right-16 top-10 h-96 w-96 rounded-full bg-indigo-300/25 blur-3xl" />
            <div className="animate-blob animation-delay-4000 absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-sky-300/25 blur-3xl" />
          </div>
        )}

        <div className="relative animate-fade-in-up">
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l2.6 6.5L21 9l-5 4.5L17.5 21 12 17.5 6.5 21 8 13.5 3 9l6.4-.5z" />
            </svg>
            Verified agents · Real-time dispatch
          </span>
          <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {settings.heroTitle ?? "Find the right property, faster"}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-600">
            {settings.heroSubtitle ??
              "Buy, sell, and rent homes with verified agents across the city."}
          </p>
          <div className="mt-8">
            <SearchBar />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <NearMeButton className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 disabled:opacity-60" />
            <Link
              href="/properties-in"
              className="text-sm font-medium text-blue-700 underline-offset-2 hover:text-blue-900 hover:underline"
            >
              Or browse by location
            </Link>
          </div>

          <div className="mx-auto mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-slate-200 pt-8">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-slate-900 sm:text-3xl">{stat.value.toLocaleString("en-IN")}+</p>
                <p className="mt-1 text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl bg-white px-4 py-14 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">
            {usingLatestFallback ? "Latest properties" : "Featured properties"}
            {location ? ` in ${location.cityName}` : ""}
          </h2>
          <Link
            href={location ? `/properties?city=${encodeURIComponent(location.cityName)}` : "/properties"}
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
          >
            View all
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
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

      <section className="border-t border-slate-200 bg-slate-50 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-900">Why {settings.siteName}</h2>
            <p className="mt-2 text-slate-600">Built for trust, speed, and zero duplicate listings.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br from-blue-50 to-indigo-50 text-blue-600 transition group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    {feature.icon}
                  </svg>
                </div>
                <p className="mt-4 font-semibold text-slate-900">{feature.title}</p>
                <p className="mt-1.5 text-sm text-slate-500">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-blue-50 px-4 py-16 text-center sm:px-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-60">
          <div className="animate-blob absolute -left-10 top-0 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl" />
          <div className="animate-blob animation-delay-2000 absolute -right-10 bottom-0 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl" />
        </div>
        <div className="relative">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Are you an agent or owner?</h2>
          <p className="mx-auto mt-2 max-w-xl text-slate-600">
            List your properties on {settings.siteName} and reach buyers and tenants directly.
          </p>
          <Link
            href={settings.ctaLink ?? "/register"}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl"
          >
            {settings.ctaText ?? "List a property"}
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
