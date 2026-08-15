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
      <h1 className="text-2xl font-bold text-slate-900">Properties</h1>
      <p className="mt-1 text-sm text-slate-500">Browse verified listings and filter by exactly what you need.</p>

      <form
        method="get"
        className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-900/5 sm:grid-cols-3 lg:grid-cols-6"
      >
        <input
          type="text"
          name="city"
          defaultValue={effectiveCity}
          placeholder="City or locality"
          className="col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 sm:col-span-1"
        />
        <select
          name="listingType"
          defaultValue={params.listingType ?? ""}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
          placeholder="Min price"
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        <input
          type="number"
          name="maxPrice"
          defaultValue={params.maxPrice}
          placeholder="Max price"
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        <button
          type="submit"
          className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-600/25 transition hover:brightness-105 active:scale-[0.98] sm:col-span-1"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          Filter
        </button>
      </form>

      <p className="mt-6 flex items-center gap-1.5 text-sm text-slate-500">
        <span className="font-semibold text-slate-900">{properties.length}</span> properties found
        {location && (
          <>
            {" "}
            in {location.cityName} ·{" "}
            <Link href="/properties?city=" className="text-blue-600 hover:underline">
              View all locations
            </Link>
          </>
        )}
      </p>

      {properties.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          <svg viewBox="0 0 24 24" fill="none" className="mx-auto h-10 w-10 text-slate-300">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <p className="mt-3">No properties match your search.</p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard key={property.slug} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}
