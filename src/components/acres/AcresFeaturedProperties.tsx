"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatIndianShortPrice, PROPERTY_TYPE_LABELS } from "@/lib/format";

type PropertyItem = {
  slug: string;
  title: string;
  city: string;
  locality: string | null;
  price: number;
  listingType: "SALE" | "RENT";
  propertyType: string;
  condition?: "NEW_BOOKING" | "RESALE" | null;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqft: number | null;
  images: { url: string }[];
};

type Props = {
  properties: PropertyItem[];
  cityName?: string | null;
};

type FilterCategory = "ALL" | "READY" | "BUDGET" | "LUXURY" | "VILLAS" | "COMMERCIAL";

export function AcresFeaturedProperties({ properties, cityName }: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("ALL");

  const filteredProperties = properties.filter((item) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "READY") {
      return item.condition === "RESALE";
    }
    if (activeFilter === "BUDGET") {
      return item.price <= 10000000; // <= 1 Crore
    }
    if (activeFilter === "LUXURY") {
      return (item.bedrooms && item.bedrooms >= 3) || item.price >= 15000000;
    }
    if (activeFilter === "VILLAS") {
      return item.propertyType === "VILLA" || item.propertyType === "INDEPENDENT_HOUSE";
    }
    if (activeFilter === "COMMERCIAL") {
      return item.propertyType === "COMMERCIAL" || item.propertyType === "OFFICE" || item.propertyType === "PLOT";
    }
    return true;
  });

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
      {/* 99acres Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#0054a6]">
            <span>✨</span> Handpicked Showcase
          </div>
          <h2 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Featured & Verified Properties {cityName ? `in ${cityName}` : "Across India"}
          </h2>
          <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500">
            Authenticated floor plans, verified ownership documents, and transparent pricing.
          </p>
        </div>

        {/* View All Button */}
        <Link
          href={cityName ? `/properties?city=${encodeURIComponent(cityName)}` : "/properties"}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0054a6] hover:bg-[#004080] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:shadow-sm"
        >
          <span>Explore All Listings</span>
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 stroke-[2.5]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* 99acres Filter Tabs */}
      <div className="mt-6 flex flex-wrap items-center gap-2 overflow-x-auto pb-2">
        {[
          { id: "ALL", label: "All Properties" },
          { id: "READY", label: "Ready to Move" },
          { id: "BUDGET", label: "Under ₹1 Crore" },
          { id: "LUXURY", label: "Luxury 3+ BHK" },
          { id: "VILLAS", label: "Villas & Houses" },
          { id: "COMMERCIAL", label: "Commercial & Plots" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id as FilterCategory)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition whitespace-nowrap ${
              activeFilter === tab.id
                ? "bg-[#0054a6] text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 99acres Property Cards Grid */}
      {filteredProperties.length === 0 ? (
        <div className="mt-8 rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
          <span className="text-4xl">🏢</span>
          <p className="mt-3 text-base font-bold text-slate-800">
            No properties matching this filter right now.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Try switching tabs or browse our complete directory.
          </p>
          <button
            type="button"
            onClick={() => setActiveFilter("ALL")}
            className="mt-4 rounded-xl bg-[#0054a6] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#004080]"
          >
            View All Properties
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => {
            const image = property.images[0]?.url;
            const pricePerSqft =
              property.areaSqft && property.areaSqft > 0
                ? Math.round(property.price / property.areaSqft)
                : null;

            return (
              <div
                key={property.slug}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl"
              >
                {/* Image Container */}
                <Link href={`/properties/${property.slug}`} className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 block">
                  {image ? (
                    <Image
                      src={image}
                      alt={property.title}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-105"
                      sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 90vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs font-semibold text-slate-400">
                      No Photo Available
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-70" />

                  {/* Top Badges (99acres style: Verified green badge, Sale/Rent tag) */}
                  <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-black uppercase text-white shadow-xs">
                      <span>✓</span> VERIFIED
                    </span>
                    <span className="rounded-md bg-slate-900/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs backdrop-blur-xs">
                      {property.listingType === "SALE" ? "FOR SALE" : "FOR RENT"}
                    </span>
                    {property.condition && (
                      <span className="rounded-md bg-amber-500 text-slate-950 px-2 py-0.5 text-[10px] font-black uppercase shadow-xs">
                        {property.condition === "NEW_BOOKING" ? "NEW" : "RESALE"}
                      </span>
                    )}
                  </div>

                  {/* Bottom Image Tag: Property Type */}
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white">
                    <span className="rounded bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs">
                      {PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType}
                    </span>
                    {pricePerSqft && (
                      <span className="text-[11px] font-bold text-white drop-shadow-sm">
                        ₹ {pricePerSqft.toLocaleString("en-IN")} / sq.ft
                      </span>
                    )}
                  </div>
                </Link>

                {/* Card Body */}
                <div className="flex flex-1 flex-col justify-between p-4 space-y-3">
                  <div>
                    {/* Price in Big Bold Text (99acres signature style) */}
                    <div className="flex items-baseline justify-between">
                      <span className="text-xl sm:text-2xl font-black text-[#0054a6] tracking-tight">
                        {formatIndianShortPrice(property.price, property.listingType)}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="mt-1 text-sm sm:text-base font-bold text-slate-900 transition group-hover:text-[#0054a6] line-clamp-1">
                      <Link href={`/properties/${property.slug}`}>
                        {property.title}
                      </Link>
                    </h3>

                    {/* Locality & City with Map Pin */}
                    <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-500 line-clamp-1">
                      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0 text-slate-400">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {[property.locality, property.city].filter(Boolean).join(", ")}
                    </p>
                  </div>

                  {/* Fact Chips (BHK, Bath, Area) */}
                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs font-bold text-slate-600">
                    {property.bedrooms != null && (
                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1">
                        🛏️ {property.bedrooms} BHK
                      </span>
                    )}
                    {property.bathrooms != null && (
                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1">
                        🚿 {property.bathrooms} Bath
                      </span>
                    )}
                    {property.areaSqft != null && (
                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1">
                        📐 {property.areaSqft.toLocaleString("en-IN")} sqft
                      </span>
                    )}
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <Link
                      href={`/properties/${property.slug}`}
                      className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 py-2 text-center text-xs font-bold text-slate-800 transition"
                    >
                      View Details
                    </Link>
                    <Link
                      href={`/properties/${property.slug}#contact`}
                      className="flex-1 rounded-xl bg-[#0054a6] hover:bg-[#004080] py-2 text-center text-xs font-bold text-white transition shadow-xs"
                    >
                      Inquire Now
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
