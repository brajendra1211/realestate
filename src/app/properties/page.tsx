import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PropertyCard } from "@/components/PropertyCard";
import { JsonLd } from "@/components/JsonLd";
import { absoluteUrl } from "@/lib/seo";
import { PUBLIC_LISTER_FILTER, notExpiredFilter } from "@/lib/propertyVisibility";
import { getLocationCookie } from "@/lib/location-context";
import type { Prisma } from "@/generated/prisma/client";

type SearchParams = Promise<{
  city?: string;
  listingType?: string;
  propertyType?: string;
  condition?: string;
  minPrice?: string;
  maxPrice?: string;
  bedrooms?: string;
}>;

const LISTING_TYPES = [
  { value: "", label: "Buy or Rent" },
  { value: "SALE", label: "Buy" },
  { value: "RENT", label: "Rent" },
];

const PROPERTY_TYPES = [
  { value: "", label: "All Property Types" },
  { value: "APARTMENT", label: "Apartment / Flat" },
  { value: "VILLA", label: "Luxury Villa" },
  { value: "INDEPENDENT_HOUSE", label: "Independent House" },
  { value: "PLOT", label: "Plot / Land" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "OFFICE", label: "Office" },
];

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const location = params.city === undefined ? await getLocationCookie() : null;
  const effectiveCity = params.city ?? location?.cityName;
  const action = params.listingType === "RENT" ? "for Rent" : params.listingType === "SALE" ? "for Sale" : "for Sale & Rent";
  const place = effectiveCity ? ` in ${effectiveCity}` : " in Noida & NCR";
  const title = `Properties ${action}${place} | Noida Prime Properties`;
  const description = `Browse 100% verified properties ${action.toLowerCase()}${place} — luxury apartments, villas, plots, and commercial spaces.`;

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl("/properties") },
  };
}

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const effectiveCity = params.city;

  const where: Prisma.PropertyWhereInput = {
    approvalStatus: "APPROVED",
    status: "AVAILABLE",
    owner: PUBLIC_LISTER_FILTER,
    AND: [notExpiredFilter()],
  };

  if (effectiveCity) {
    where.OR = [
      { city: { contains: effectiveCity } },
      { locality: { contains: effectiveCity } },
    ];
  }
  if (params.listingType === "SALE" || params.listingType === "RENT") {
    where.listingType = params.listingType;
  }
  if (params.propertyType) {
    where.propertyType = params.propertyType as Prisma.PropertyWhereInput["propertyType"];
  }
  if (params.condition === "NEW_BOOKING" || params.condition === "RESALE") {
    where.condition = params.condition;
  }
  if (params.bedrooms) {
    where.bedrooms = { gte: Number(params.bedrooms) };
  }
  if (params.minPrice || params.maxPrice) {
    where.price = {
      ...(params.minPrice ? { gte: Number(params.minPrice) } : {}),
      ...(params.maxPrice ? { lte: Number(params.maxPrice) } : {}),
    };
  }

  // §3.3's Buy/Rent browse page used to only show website self-listings
  // (Property) — a buyer had no way to know channel-partner marketplace
  // listings (AgentListing) lived on a separate /listings page at all, and
  // kept reporting listings as "missing". Merged here instead of unifying
  // the two underlying data models (which the pay-to-unlock/commission/
  // co-listing engine in src/lib/listing.ts depends on keeping distinct).
  const agentListingWhere: Prisma.AgentListingWhereInput = {
    approvalStatus: "APPROVED",
    isDelisted: false,
    OR: [{ listingExpiresAt: null }, { listingExpiresAt: { gt: new Date() } }],
  };
  if (params.listingType === "SALE" || params.listingType === "RENT") {
    agentListingWhere.listingType = params.listingType;
  }
  if (params.propertyType) {
    agentListingWhere.propertyType = params.propertyType as Prisma.AgentListingWhereInput["propertyType"];
  }
  if (params.bedrooms) {
    agentListingWhere.bedrooms = { gte: Number(params.bedrooms) };
  }
  if (params.minPrice || params.maxPrice) {
    agentListingWhere.price = {
      ...(params.minPrice ? { gte: Number(params.minPrice) } : {}),
      ...(params.maxPrice ? { lte: Number(params.maxPrice) } : {}),
    };
  }
  if (effectiveCity) {
    agentListingWhere.masterProperty = {
      OR: [{ city: { contains: effectiveCity } }, { locality: { contains: effectiveCity } }],
    };
  }
  // AgentListing has no NEW_BOOKING/RESALE condition field — a condition
  // filter should exclude these from the merged results, not ignore the
  // filter, so it isn't silently dropped.
  const skipAgentListings = params.condition === "NEW_BOOKING" || params.condition === "RESALE";

  const [websiteProperties, agentListings] = await Promise.all([
    prisma.property.findMany({
      where,
      include: { images: { orderBy: { order: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    skipAgentListings
      ? Promise.resolve([])
      : prisma.agentListing.findMany({
          where: agentListingWhere,
          include: {
            images: { orderBy: { order: "asc" }, take: 1 },
            masterProperty: { select: { city: true, locality: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 60,
        }),
  ]);

  const properties = [
    ...websiteProperties.map((p) => ({
      slug: p.slug,
      title: p.title,
      city: p.city,
      locality: p.locality,
      price: p.price,
      listingType: p.listingType,
      propertyType: p.propertyType,
      condition: p.condition,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      areaSqft: p.areaSqft,
      images: p.images,
      createdAt: p.createdAt,
      detailHref: `/properties/${p.slug}`,
    })),
    ...agentListings.map((l) => ({
      slug: l.slug,
      title: l.title,
      city: l.masterProperty.city,
      locality: l.masterProperty.locality,
      price: l.price,
      listingType: l.listingType,
      propertyType: l.propertyType,
      condition: null,
      bedrooms: l.bedrooms,
      bathrooms: l.bathrooms,
      areaSqft: l.areaSqft,
      images: l.images,
      createdAt: l.createdAt,
      detailHref: `/listings/${l.slug}`,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Properties for Sale & Rent in Noida",
    url: absoluteUrl("/properties"),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: properties.slice(0, 20).map((property, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(property.detailHref),
      })),
    },
  };

  const currentTab = params.listingType === "SALE" ? "SALE" : params.listingType === "RENT" ? "RENT" : "ALL";

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      <JsonLd data={collectionJsonLd} />

      {/* Modern Page Header Banner */}
      <div className="border-b border-slate-200 bg-white py-8 px-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
                <Link href="/" className="hover:text-blue-600 transition">Home</Link>
                <span>/</span>
                <span className="text-slate-800">Properties</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {currentTab === "SALE"
                  ? "Properties for Sale in Noida & NCR"
                  : currentTab === "RENT"
                  ? "Properties for Rent in Noida & NCR"
                  : "All Verified Properties in Noida & NCR"}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                Direct from verified owners and certified channel partners · 100% RERA compliant
              </p>
            </div>

            {/* Quick Listing Type Switcher Pills */}
            <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 p-1 border border-slate-200/80">
              <Link
                href="/properties"
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  currentTab === "ALL"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({properties.length})
              </Link>
              <Link
                href="/properties?listingType=SALE"
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  currentTab === "SALE"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Buy (Sale)
              </Link>
              <Link
                href="/properties?listingType=RENT"
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  currentTab === "RENT"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Rent (Lease)
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        {/* Filter Console */}
        <form
          method="get"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm"
        >
          {/* City / Locality input */}
          <div className="lg:col-span-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Sector / Locality
            </label>
            <input
              type="text"
              name="city"
              defaultValue={effectiveCity}
              placeholder="e.g. Sector 43, Sector 128..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none transition"
            />
          </div>

          {/* Listing Type */}
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Listing Type
            </label>
            <select
              name="listingType"
              defaultValue={params.listingType ?? ""}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-600 focus:bg-white focus:outline-none transition cursor-pointer"
            >
              {LISTING_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Property Type */}
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Property Type
            </label>
            <select
              name="propertyType"
              defaultValue={params.propertyType ?? ""}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-blue-600 focus:bg-white focus:outline-none transition cursor-pointer"
            >
              {PROPERTY_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Min Price */}
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Min Budget (₹)
            </label>
            <input
              type="number"
              name="minPrice"
              defaultValue={params.minPrice}
              placeholder="Min ₹"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none transition"
            />
          </div>

          {/* Max Price */}
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Max Budget (₹)
            </label>
            <input
              type="number"
              name="maxPrice"
              defaultValue={params.maxPrice}
              placeholder="Max ₹"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-600 focus:bg-white focus:outline-none transition"
            />
          </div>

          {/* Submit & Reset Buttons */}
          <div className="lg:col-span-1 flex items-end">
            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-2.5 px-3 text-xs font-bold text-white shadow-xs transition hover:shadow-md cursor-pointer text-center"
            >
              Filter
            </button>
          </div>
        </form>

        {/* Results Header */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold text-slate-600">
            Showing <span className="text-slate-900 font-extrabold">{properties.length}</span> verified properties in Noida & NCR
          </p>

          <Link
            href="/properties"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          >
            Clear all filters
          </Link>
        </div>

        {/* Properties Grid */}
        {properties.length === 0 ? (
          <div className="mt-8 rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center bg-white shadow-xs">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600 mb-3">
              🔍
            </div>
            <h3 className="text-base font-bold text-slate-900">No properties found matching your criteria</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your price range or clearing locality filters to see more results.
            </p>
            <Link
              href="/properties"
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-700 shadow-xs"
            >
              Reset Filters
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <PropertyCard key={property.detailHref} property={property} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
