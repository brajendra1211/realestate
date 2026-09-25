import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PropertyCard } from "@/components/PropertyCard";
import { JsonLd } from "@/components/JsonLd";
import { HeroSlider } from "@/components/HeroSlider";
import { DevelopersMarquee } from "@/components/DevelopersMarquee";
import { getSiteSettings } from "@/lib/site-settings";
import { PUBLIC_LISTER_FILTER, notExpiredFilter } from "@/lib/propertyVisibility";
import { getLocationCookie } from "@/lib/location-context";
import { SITE_URL } from "@/lib/seo";

const FEATURES = [
  {
    title: "Verified Channel Partners",
    body: "Every partner is verified via official documentation and Prime-activated before publishing inventory.",
    badge: "100% Vetted",
    colorTheme: "border-emerald-200/90 hover:border-emerald-400 bg-linear-to-br from-emerald-50/40 via-white to-teal-50/30",
    iconBg: "bg-emerald-600 text-white shadow-emerald-500/25",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  },
  {
    title: "Instant Live Dispatch",
    body: "Request site visits and get matched with the nearest authorized channel partner in real time — zero waiting.",
    badge: "Under 30 Secs",
    colorTheme: "border-blue-200/90 hover:border-blue-400 bg-linear-to-br from-blue-50/40 via-white to-indigo-50/30",
    iconBg: "bg-blue-600 text-white shadow-blue-500/25",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    ),
  },
  {
    title: "Zero Duplicate Inventory",
    body: "Every property is cross-checked against our master registry so you never see the same listing twice.",
    badge: "Master Deduplication",
    colorTheme: "border-amber-200/90 hover:border-amber-400 bg-linear-to-br from-amber-50/40 via-white to-orange-50/30",
    iconBg: "bg-amber-600 text-white shadow-amber-500/25",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-5 9l2 2 4-4" />
    ),
  },
  {
    title: "Transparent Leaderboard",
    body: "Rankings and trust ratings are computed live from authentic customer feedback and real deal milestones.",
    badge: "Authentic Reviews",
    colorTheme: "border-purple-200/90 hover:border-purple-400 bg-linear-to-br from-purple-50/40 via-white to-pink-50/30",
    iconBg: "bg-purple-600 text-white shadow-purple-500/25",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l2.6 6.5L21 9l-5 4.5L17.5 21 12 17.5 6.5 21 8 13.5 3 9l6.4-.5z" />
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

  // Fall back to latest listings if nothing has been marked featured yet.
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

  const [propertyCount, agentCount, cityCount, developers] = await Promise.all([
    prisma.property.count({
      where: { approvalStatus: "APPROVED", status: "AVAILABLE", owner: PUBLIC_LISTER_FILTER, ...notExpiredFilter() },
    }),
    prisma.agentProfile.count({ where: { primeStatus: true } }),
    prisma.city.count({ where: { published: true } }),
    prisma.developer.findMany({
      include: { _count: { select: { projects: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }).catch(() => []),
  ]);

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
    <div className="bg-slate-50/50">
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={websiteJsonLd} />

      {/* --- DYNAMIC COLORFUL HERO SLIDER --- */}
      <HeroSlider
        propertyCount={propertyCount}
        agentCount={agentCount}
        cityCount={cityCount}
      />

      {/* --- FEATURED PROPERTIES SECTION WITH VIBRANT CURATION BAR --- */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-linear-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-500/20 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-blue-700">
              <span>💎</span> Premier Residential Selection
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-4xl tracking-tight">
              {usingLatestFallback ? "Latest Handpicked Listings" : "Featured Prime Properties"}
              {location ? ` in ${location.cityName}` : ""}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
              Verified by certified channel partners with accurate floorplans and pricing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/properties?listingType=SALE"
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition"
            >
              Buy
            </Link>
            <Link
              href="/properties?listingType=RENT"
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50 transition"
            >
              Rent
            </Link>
            <Link
              href={location ? `/properties?city=${encodeURIComponent(location.cityName)}` : "/properties"}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800"
            >
              <span>View All</span>
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {featuredProperties.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center bg-white shadow-xs">
            <span className="text-4xl">🏡</span>
            <p className="mt-3 text-base font-bold text-slate-800">No properties available currently.</p>
            <p className="text-xs text-slate-400 mt-1">Check back shortly or explore other cities in our network.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProperties.map((property) => (
              <PropertyCard key={property.slug} property={property} />
            ))}
          </div>
        )}
      </section>

      {/* --- DEVELOPERS AUTO-SLIDER (RIGHT-TO-LEFT MARQUEE) --- */}
      <DevelopersMarquee
        dbDevelopers={developers.map((d) => ({
          id: d.id,
          name: d.name,
          slug: d.slug,
          city: d.city,
          logoUrl: d.logoUrl,
          projectCount: d._count?.projects,
        }))}
      />

      {/* --- WHY BAYAESTATE COLORFUL 4-PILLAR FEATURES GRID --- */}
      <section className="border-t border-slate-200/80 bg-white px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-linear-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/20 px-3.5 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-800">
              The Gold Standard
            </span>
            <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl tracking-tight">
              Built For Speed, Trust & Transparency
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed font-medium">
              We eliminate broker spam, phantom listings, and endless follow-ups through official channel partner verification.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className={`group relative rounded-3xl border p-6 shadow-xs transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${feature.colorTheme}`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-md transition group-hover:scale-105 ${feature.iconBg}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                      {feature.icon}
                    </svg>
                  </div>
                  <span className="rounded-full bg-white/90 border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 shadow-xs">
                    {feature.badge}
                  </span>
                </div>

                <h3 className="mt-5 font-bold text-slate-900 text-base">{feature.title}</h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed font-medium">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- VIBRANT COLORFUL CTA BANNER --- */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border-2 border-indigo-500/30 bg-linear-to-br from-slate-950 via-indigo-950 to-purple-950 p-8 text-center text-white shadow-2xl sm:p-14">
          {/* Glowing ambient light spheres */}
          <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 -bottom-20 h-72 w-72 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-96 rounded-full bg-purple-500/20 blur-3xl" />

          <div className="relative mx-auto max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-linear-to-r from-amber-400/20 to-orange-400/20 border border-amber-400/40 px-4 py-1.5 text-xs font-black text-amber-300">
              ✨ Join Our Verified Partner Network
            </span>
            <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl text-white leading-tight">
              List Your Properties With BayaEstate
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              Publish inventory to qualified buyers, get your official QR standee for your shop, and receive real-time dispatch leads.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={settings.ctaLink ?? "/register"}
                className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-amber-400 via-amber-500 to-orange-500 px-7 py-3.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>{settings.ctaText ?? "List a property"}</span>
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/register/agent"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-6 py-3.5 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/20"
              >
                Become a Channel Partner
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
