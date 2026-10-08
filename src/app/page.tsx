import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { JsonLd } from "@/components/JsonLd";
import { getSiteSettings } from "@/lib/site-settings";
import { PUBLIC_LISTER_FILTER, notExpiredFilter } from "@/lib/propertyVisibility";
import { getLocationCookie } from "@/lib/location-context";
import { SITE_URL } from "@/lib/seo";
import { AcresHero } from "@/components/acres/AcresHero";
import { PropertyCard } from "@/components/PropertyCard";

export default async function Home() {
  const [settings, location, dbCities] = await Promise.all([
    getSiteSettings(),
    getLocationCookie(),
    prisma.city.findMany({
      where: { published: true },
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const properties = await prisma.property.findMany({
    where: {
      approvalStatus: "APPROVED",
      status: "AVAILABLE",
      owner: PUBLIC_LISTER_FILTER,
      ...notExpiredFilter(),
    },
    include: { images: { orderBy: { order: "asc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  const propertyCount = await prisma.property.count({
    where: { approvalStatus: "APPROVED", status: "AVAILABLE", owner: PUBLIC_LISTER_FILTER, ...notExpiredFilter() },
  });

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: settings.siteName || "Noida Prime Properties",
    url: SITE_URL,
    logo: settings.logoUrl ? { "@type": "ImageObject", url: settings.logoUrl } : undefined,
  };

  const topSectors = [
    {
      title: "Sector 150, Noida",
      tagline: "Sports City & Expressway Green Belt",
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80",
      query: "Sector 150",
    },
    {
      title: "Sector 128, Noida",
      tagline: "Golf Course Living & Jaypee Wish Town",
      image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600&auto=format&fit=crop&q=80",
      query: "Sector 128",
    },
    {
      title: "Sector 43 & Central Noida",
      tagline: "Forest-Themed Residencies & Metro Connected",
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&auto=format&fit=crop&q=80",
      query: "Sector 43",
    },
    {
      title: "Greater Noida West",
      tagline: "Fastest-Growing Affordable & Mid-Segment Hub",
      image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80",
      query: "Greater Noida West",
    },
  ];

  return (
    <div className="bg-white min-h-screen text-slate-900">
      <JsonLd data={organizationJsonLd} />

      {/* 1. Hero Section */}
      <AcresHero
        propertyCount={propertyCount || 5}
        agentCount={150}
        cityCount={dbCities.length || 2}
        currentCityName={location?.cityName}
        cities={dbCities}
      />

      {/* 2. Featured Verified Listings */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Verified Residences
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Featured Properties in Noida & NCR
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
              Sanctioned layouts, authenticated ownership documents, and transparent pricing.
            </p>
          </div>

          <Link
            href="/properties"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white transition shadow-xs"
          >
            <span>View All ({propertyCount})</span>
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 stroke-[2.5]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* 3-Column Property Card Grid */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <PropertyCard key={property.slug} property={property} />
          ))}
        </div>
      </section>

      {/* 3. Explore Top Sectors in Noida */}
      <section className="bg-slate-50 border-y border-slate-200/80 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Explore Popular Localities
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Discover residential hotspots offering prime connectivity, top schools, and lush green belts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {topSectors.map((sec) => (
              <Link
                key={sec.title}
                href={`/properties?city=${encodeURIComponent(sec.query)}`}
                className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                  <Image
                    src={sec.image}
                    alt={sec.title}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h3 className="font-bold text-sm leading-snug">{sec.title}</h3>
                    <p className="text-[11px] text-slate-300 font-medium leading-tight mt-0.5">{sec.tagline}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Trust Pillars & Advantages */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-16">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Why Noida Prime Properties?
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            We provide a modern, transparent, and hassle-free real estate transaction experience.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div className="rounded-xl border border-slate-200/80 p-6 space-y-3 bg-white shadow-xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="font-bold text-base text-slate-900">RERA Verified Inventory</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Every project and builder listing is verified against official RERA registrations and approved floor plans.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/80 p-6 space-y-3 bg-white shadow-xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-base text-slate-900">Zero Brokerage Options</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Connect directly with verified individual property owners and certified builders without paying brokerage.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/80 p-6 space-y-3 bg-white shadow-xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-base text-slate-900">Assisted Site Visits</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Dedicated relationship managers assist your on-ground property inspections and facilitate legal diligence.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Owner Callout Strip */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-20">
        <div className="rounded-2xl bg-slate-900 text-white p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Looking to Sell or Rent Your Property in Noida?
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              List your flat, villa, plot, or commercial space for free and connect with thousands of active buyers every month.
            </p>
          </div>
          <Link
            href="/register"
            className="rounded-lg bg-blue-600 hover:bg-blue-700 px-6 py-3 text-xs sm:text-sm font-bold text-white transition shadow-sm shrink-0"
          >
            Post Property Free
          </Link>
        </div>
      </section>
    </div>
  );
}
