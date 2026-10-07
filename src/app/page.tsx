import { prisma } from "@/lib/prisma";
import { JsonLd } from "@/components/JsonLd";
import { getSiteSettings } from "@/lib/site-settings";
import { PUBLIC_LISTER_FILTER, notExpiredFilter } from "@/lib/propertyVisibility";
import { getLocationCookie } from "@/lib/location-context";
import { SITE_URL } from "@/lib/seo";

// 99acres UI Components
import { AcresHero } from "@/components/acres/AcresHero";
import { AcresOwnerBanner } from "@/components/acres/AcresOwnerBanner";
import { AcresCategoryGrid } from "@/components/acres/AcresCategoryGrid";
import { AcresFeaturedProperties } from "@/components/acres/AcresFeaturedProperties";
import { DevelopersMarquee } from "@/components/DevelopersMarquee";
import { AcresEmiCalculator } from "@/components/acres/AcresEmiCalculator";
import { AcresPriceTrends } from "@/components/acres/AcresPriceTrends";
import { AcresTopCities } from "@/components/acres/AcresTopCities";
import { AcresTrustBadges } from "@/components/acres/AcresTrustBadges";
import { AcresAppDownload } from "@/components/acres/AcresAppDownload";
import { AcresSeoDirectory } from "@/components/acres/AcresSeoDirectory";

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
    take: 9,
  });

  // If there are fewer than 4 featured properties in the selected location, show all featured properties so showcase is always full
  if (featuredProperties.length < 4) {
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
      take: 12,
    });
  }

  // Fall back to latest listings if nothing has been marked featured yet.
  if (featuredProperties.length === 0) {
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
      take: 9,
    });
  }

  // Fallback to all properties if still zero
  if (featuredProperties.length === 0) {
    featuredProperties = await prisma.property.findMany({
      where: {
        approvalStatus: "APPROVED",
        status: "AVAILABLE",
        owner: PUBLIC_LISTER_FILTER,
        ...notExpiredFilter(),
      },
      include: { images: { orderBy: { order: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 9,
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
      take: 12,
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
    <div className="bg-white min-h-screen text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={websiteJsonLd} />

      {/* 1. 99ACRES SIGNATURE HERO WITH MULTI-TAB SEARCH BOX */}
      <AcresHero
        propertyCount={propertyCount || 10000}
        agentCount={agentCount || 4500}
        cityCount={cityCount || 12}
        currentCityName={location?.cityName}
        cities={dbCities}
      />

      {/* 2. 99ACRES OWNER CALLOUT STRIP (POST PROPERTY FREE) */}
      <AcresOwnerBanner />

      {/* 3. 99ACRES POPULAR CHOICES CATEGORY CARDS */}
      <AcresCategoryGrid />

      {/* 4. 99ACRES FEATURED & VERIFIED PROPERTIES SHOWCASE (TABBED) */}
      <AcresFeaturedProperties
        properties={featuredProperties}
        cityName={location?.cityName}
      />

      {/* 5. TOP DEVELOPERS & BUILDERS IN SPOTLIGHT MARQUEE */}
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

      {/* 6. 99ACRES INTERACTIVE HOME LOAN EMI CALCULATOR */}
      <AcresEmiCalculator />

      {/* 7. REAL ESTATE RATES & PRICE TRENDS INDEX */}
      <AcresPriceTrends />

      {/* 8. EXPLORE REAL ESTATE IN TOP INDIAN CITIES */}
      <AcresTopCities />

      {/* 9. WHY 99ACRES / TRUST PILLARS */}
      <AcresTrustBadges />

      {/* 10. DOWNLOAD MOBILE APP BANNER */}
      <AcresAppDownload />

      {/* 11. POPULAR SEARCHES DIRECTORY LINKS */}
      <AcresSeoDirectory />
    </div>
  );
}
