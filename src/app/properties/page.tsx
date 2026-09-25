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

const CONDITIONS = [
  { value: "", label: "New or Resale" },
  { value: "NEW_BOOKING", label: "New Booking" },
  { value: "RESALE", label: "Resale" },
];

const PROPERTY_TYPES = [
  { value: "", label: "Any type" },
  { value: "APARTMENT", label: "Apartment" },
  { value: "VILLA", label: "Villa" },
  { value: "INDEPENDENT_HOUSE", label: "Independent House" },
  { value: "PLOT", label: "Plot" },
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
  const place = effectiveCity ? ` in ${effectiveCity}` : "";
  const title = `Properties ${action}${place}`;
  const description = `Browse verified properties ${action.toLowerCase()}${place} — apartments, villas, plots, and commercial spaces from trusted dealers and owners.`;

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
  const location = params.city === undefined ? await getLocationCookie() : null;
  const effectiveCity = params.city ?? location?.cityName;

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

  const properties = await prisma.property.findMany({
    where,
    include: { images: { orderBy: { order: "asc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Properties for Sale & Rent",
    url: absoluteUrl("/properties"),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: properties.slice(0, 20).map((property, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(`/properties/${property.slug}`),
      })),
    },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <JsonLd data={collectionJsonLd} />
      <div className="border-b border-slate-200/80 pb-5">
        <span className="text-[11px] font-black uppercase tracking-widest text-blue-600">
          Curated Catalog
        </span>
        <h1 className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl tracking-tight">
          Properties {effectiveCity ? `in ${effectiveCity}` : "Directory"}
        </h1>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          Explore verified residential and commercial spaces from certified channel partners.
        </p>
      </div>

      <form
        method="get"
        className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs sm:grid-cols-3 lg:grid-cols-6"
      >
        <input
          type="text"
          name="city"
          defaultValue={effectiveCity}
          placeholder="City or locality"
          className="col-span-2 rounded-xl border border-slate-200/90 bg-slate-50/50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition focus:border-slate-400 focus:bg-white focus:outline-none sm:col-span-1"
        />
        <select
          name="listingType"
          defaultValue={params.listingType ?? ""}
          className="rounded-xl border border-slate-200/90 bg-slate-50/50 px-3 py-2.5 text-xs font-semibold text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none cursor-pointer"
        >
          {LISTING_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          name="propertyType"
          defaultValue={params.propertyType ?? ""}
          className="rounded-xl border border-slate-200/90 bg-slate-50/50 px-3 py-2.5 text-xs font-semibold text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none cursor-pointer"
        >
          {PROPERTY_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          name="condition"
          defaultValue={params.condition ?? ""}
          className="rounded-xl border border-slate-200/90 bg-slate-50/50 px-3 py-2.5 text-xs font-semibold text-slate-700 transition focus:border-slate-400 focus:bg-white focus:outline-none cursor-pointer"
        >
          {CONDITIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          name="minPrice"
          defaultValue={params.minPrice}
          placeholder="Min price (₹)"
          className="rounded-xl border border-slate-200/90 bg-slate-50/50 px-3 py-2.5 text-xs font-semibold text-slate-800 transition focus:border-slate-400 focus:bg-white focus:outline-none"
        />
        <div className="flex gap-2">
          <input
            type="number"
            name="maxPrice"
            defaultValue={params.maxPrice}
            placeholder="Max price (₹)"
            className="w-full rounded-xl border border-slate-200/90 bg-slate-50/50 px-3 py-2.5 text-xs font-semibold text-slate-800 transition focus:border-slate-400 focus:bg-white focus:outline-none"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-xs transition hover:bg-slate-800 active:scale-[0.98] shrink-0"
          >
            Apply
          </button>
        </div>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-600">
          Showing <span className="text-slate-900">{properties.length}</span> verified properties
          {location && (
            <>
              {" "}
              in {location.cityName} ·{" "}
              <Link href="/properties?city=" className="text-blue-600 hover:underline">
                View all cities
              </Link>
            </>
          )}
        </p>
      </div>

      {properties.length === 0 ? (
        <div className="mt-6 rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center bg-white shadow-xs">
          <span className="text-3xl">🔍</span>
          <p className="mt-2 text-sm font-bold text-slate-800">No properties match your filter.</p>
          <p className="mt-1 text-xs text-slate-400">Try adjusting your price range or selecting another locality.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard key={property.slug} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}
