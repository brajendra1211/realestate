import Image from "next/image";
import Link from "next/link";
import { formatPrice, PROPERTY_TYPE_LABELS } from "@/lib/format";

type PropertyCardData = {
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

function FactIcon({ kind }: { kind: "bed" | "bath" | "area" }) {
  if (kind === "bed") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-slate-500">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 18v-6a2 2 0 012-2h14a2 2 0 012 2v6M3 18v2M21 18v2M3 12V8a1 1 0 011-1h5a1 1 0 011 1v2" />
      </svg>
    );
  }
  if (kind === "bath") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-slate-500">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 12h16v3a4 4 0 01-4 4H8a4 4 0 01-4-4v-3zM7 12V6a2 2 0 012-2h1M3 12h1" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-slate-500">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}

export function PropertyCard({ property }: { property: PropertyCardData }) {
  const image = property.images[0]?.url;

  return (
    <Link
      href={`/properties/${property.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/10"
    >
      {/* Property Image Container */}
      <div className="relative aspect-[16/11] w-full overflow-hidden bg-slate-100">
        {image ? (
          <Image
            src={image}
            alt={property.title}
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 90vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400 bg-slate-50">
            No photo available
          </div>
        )}

        {/* Soft Vignette Gradient */}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent opacity-80" />

        {/* Top Badges */}
        <div className="absolute left-3.5 top-3.5 flex flex-wrap gap-1.5">
          <span
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold tracking-wide shadow-sm backdrop-blur-md ${
              property.listingType === "SALE"
                ? "bg-slate-900/90 text-white border border-white/20"
                : "bg-blue-600/90 text-white border border-white/20"
            }`}
          >
            {property.listingType === "SALE" ? "FOR SALE" : "FOR RENT"}
          </span>

          {property.condition && (
            <span className="rounded-lg bg-white/95 px-2 py-1 text-[11px] font-bold text-amber-700 shadow-sm border border-amber-200/60 backdrop-blur-md">
              {property.condition === "NEW_BOOKING" ? "NEW" : "RESALE"}
            </span>
          )}
        </div>

        {/* Price on Image corner or header */}
        <div className="absolute bottom-3 left-3.5 right-3.5 flex items-end justify-between text-white">
          <span className="text-xl font-black tracking-tight drop-shadow-md text-white">
            {formatPrice(property.price, property.listingType)}
          </span>
          <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-slate-200 uppercase backdrop-blur-xs border border-white/10">
            {PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType}
          </span>
        </div>
      </div>

      {/* Property Details Body */}
      <div className="flex flex-1 flex-col justify-between p-4 space-y-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 transition group-hover:text-blue-600 line-clamp-1">
            {property.title}
          </h3>

          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 font-medium line-clamp-1">
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0 text-slate-400">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21s-7-6.1-7-11a7 7 0 1114 0c0 4.9-7 11-7 11z" />
              <circle cx="12" cy="10" r="2.5" strokeWidth={1.8} />
            </svg>
            {[property.locality, property.city].filter(Boolean).join(", ") || "Prime Location"}
          </p>
        </div>

        {/* Features Chips with crisp borders */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs font-semibold text-slate-600">
          {property.bedrooms != null && (
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 border border-slate-200/80">
              <FactIcon kind="bed" />
              <span>{property.bedrooms} BHK</span>
            </div>
          )}
          {property.bathrooms != null && (
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 border border-slate-200/80">
              <FactIcon kind="bath" />
              <span>{property.bathrooms} Bath</span>
            </div>
          )}
          {property.areaSqft != null && (
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1 border border-slate-200/80">
              <FactIcon kind="area" />
              <span>{property.areaSqft} sqft</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
