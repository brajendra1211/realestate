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
    title: "Verified Channel Partners",
    body: "Every partner is verified via official documentation and Prime-activated before publishing inventory.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  },
  {
    title: "Instant Live Dispatch",
    body: "Request site visits and get connected directly with the nearest authorized channel partner in real time.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
    ),
  },
  {
    title: "Zero Duplicate Inventory",
    body: "Every flat, villa, and plot is cross-checked with master registry records so you never see repetitive listings.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-5 9l2 2 4-4" />
    ),
  },
  {
    title: "Verified Market Ranking",
    body: "Leaderboards and ratings are powered purely by authentic transaction records and real client feedback.",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 2l2.6 6.5L21 9l-5 4.5L17.5 21 12 17.5 6.5 21 8 13.5 3 9l6.4-.5z" />
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

  // Fall back to the latest listings if nothing has been marked featured yet.
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
    { label: "Active Properties", value: propertyCount },
    { label: "Verified Prime Partners", value: agentCount },
    { label: "Cities Covered", value: cityCount },
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
    <div className="bg-slate-50/40">
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={websiteJsonLd} />

      {/* --- HERO SECTION --- */}
      <section
        className="relative overflow-hidden border-b border-slate-200/80 bg-linear-to-b from-white via-slate-50/50 to-white px-4 py-20 text-center sm:px-6 sm:py-24"
        style={settings.heroImage ? { backgroundImage: `url(${settings.heroImage})` } : undefined}
      >
        {settings.heroImage && <div className="absolute inset-0 bg-white/85 backdrop-blur-xs" />}

        {/* Subtle Luxury Ambient Glow */}
        {!settings.heroImage && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-20 -top-20 h-[480px] w-[480px] rounded-full bg-blue-500/5 blur-3xl" />
            <div className="absolute -right-20 top-10 h-[500px] w-[500px] rounded-full bg-indigo-500/5 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[350px] w-[600px] rounded-full bg-amber-500/5 blur-3xl" />
          </div>
        )}

        <div className="relative mx-auto max-w-4xl">
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-50/70 px-4 py-1.5 text-xs font-bold text-blue-700 shadow-xs backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            Verified Channel Partners · Zero Broker Spam · Real-Time Direct Access
          </div>

          {/* Headline */}
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-black tracking-tight text-slate-900 sm:text-6xl sm:leading-[1.1]">
            {settings.heroTitle ?? "Find Extraordinary Homes With Verified Partners"}
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-5 max-w-2xl text-base text-slate-600 sm:text-lg leading-relaxed">
            {settings.heroSubtitle ??
              "Direct access to verified properties and top-tier channel partners across premier residential hubs."}
          </p>

          {/* Elevated Search Bar Container */}
          <div className="mt-9">
            <SearchBar />
          </div>

          {/* Near Me & Location Actions */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <NearMeButton className="inline-flex items-center gap-2 rounded-full border border-slate-300/80 bg-white px-5 py-2.5 text-xs font-bold text-slate-800 shadow-xs transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60" />
            <Link
              href="/properties"
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 transition underline-offset-4 hover:underline"
            >
              Browse all properties →
            </Link>
          </div>

          {/* Clean 3-Box Stats Bar */}
          <div className="mx-auto mt-12 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-xs backdrop-blur-xs transition hover:border-slate-300"
              >
                <p className="text-2xl font-black text-slate-900 sm:text-3xl tracking-tight">
                  {stat.value.toLocaleString("en-IN")}+
                </p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FEATURED PROPERTIES SECTION --- */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div>
            <span className="text-[11px] font-black uppercase tracking-widest text-blue-600">
              Curated Portfolio
            </span>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl tracking-tight">
              {usingLatestFallback ? "Latest Properties" : "Featured Properties"}
              {location ? ` in ${location.cityName}` : ""}
            </h2>
          </div>

          <Link
            href={location ? `/properties?city=${encodeURIComponent(location.cityName)}` : "/properties"}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-xs transition hover:bg-slate-50 hover:border-slate-300"
          >
            <span>View all inventory</span>
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-slate-500">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {featuredProperties.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center bg-white shadow-xs">
            <span className="text-3xl">🏠</span>
            <p className="mt-2 text-sm font-semibold text-slate-700">No properties available currently.</p>
            <p className="text-xs text-slate-400 mt-1">Check back shortly or browse other locations.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProperties.map((property) => (
              <PropertyCard key={property.slug} property={property} />
            ))}
          </div>
        )}
      </section>

      {/* --- WHY BAYAESTATE FEATURES GRID --- */}
      <section className="border-t border-slate-200/80 bg-white px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-[11px] font-black uppercase tracking-widest text-blue-600">
              The Standard of Excellence
            </span>
            <h2 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl tracking-tight">
              Why Choose {settings.siteName}
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Designed from the ground up for absolute transparency, swift verified discovery, and verified direct contact.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group relative rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-amber-400 shadow-sm transition group-hover:scale-105">
                  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                    {feature.icon}
                  </svg>
                </div>
                <h3 className="mt-5 font-bold text-slate-900 text-base">{feature.title}</h3>
                <p className="mt-2 text-xs text-slate-500 leading-relaxed">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- LUXURY CTA SECTION --- */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-linear-to-br from-slate-950 via-slate-900 to-indigo-950 p-8 text-center text-white shadow-2xl sm:p-14">
          {/* Subtle glowing ambient spheres */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

          <div className="relative mx-auto max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 px-3.5 py-1 text-xs font-bold text-amber-300">
              For Channel Partners & Owners
            </span>
            <h2 className="mt-4 text-2xl font-black tracking-tight sm:text-4xl text-white">
              List Your Properties With BayaEstate
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-xs sm:text-sm text-slate-300 leading-relaxed">
              Showcase your listings to verified buyers, get an official Shop QR code standee, and receive verified leads with direct dispatch.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={settings.ctaLink ?? "/register"}
                className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-7 py-3.5 text-xs font-black text-slate-950 shadow-lg transition hover:bg-amber-400 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>{settings.ctaText ?? "List a property"}</span>
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/register/agent"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-3.5 text-xs font-bold text-white transition hover:bg-white/15"
              >
                Become a Partner
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
