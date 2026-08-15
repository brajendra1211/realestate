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
      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-slate-400">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 18v-6a2 2 0 012-2h14a2 2 0 012 2v6M3 18v2M21 18v2M3 12V8a1 1 0 011-1h5a1 1 0 011 1v2" />
      </svg>
    );
  }
  if (kind === "bath") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-slate-400">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 12h16v3a4 4 0 01-4 4H8a4 4 0 01-4-4v-3zM7 12V6a2 2 0 012-2h1M3 12h1" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-slate-400">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}

export function PropertyCard({ property }: { property: PropertyCardData }) {
  const image = property.images[0]?.url;

  return (
    <Link
      href={`/properties/${property.slug}`}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-900/10"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {image ? (
          <Image
            src={image}
            alt={property.title}
            fill
            className="object-cover transition duration-500 group-hover:scale-110"
            sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            No photo
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/35 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
            {property.listingType === "SALE" ? "For Sale" : "For Rent"}
          </span>
          {property.condition && (
            <span className="rounded-full bg-amber-50/95 px-2.5 py-1 text-xs font-semibold text-amber-700 shadow-sm backdrop-blur">
              {property.condition === "NEW_BOOKING" ? "New" : "Resale"}
            </span>
          )}
        </div>
      </div>
      <div className="space-y-1.5 p-4">
        <p className="text-lg font-bold text-slate-900">
          {formatPrice(property.price, property.listingType)}
        </p>
        <h3 className="truncate font-medium text-slate-800 transition group-hover:text-blue-700">
          {property.title}
        </h3>
        <p className="flex items-center gap-1 truncate text-sm text-slate-500">
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0 text-slate-400">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 21s-7-6.1-7-11a7 7 0 1114 0c0 4.9-7 11-7 11z" />
            <circle cx="12" cy="10" r="2.5" strokeWidth={1.75} />
          </svg>
          {[property.locality, property.city].filter(Boolean).join(", ")}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-xs font-medium text-slate-500">
          <span>{PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType}</span>
          {property.bedrooms != null && (
            <span className="flex items-center gap-1">
              <FactIcon kind="bed" /> {property.bedrooms} Bed
            </span>
          )}
          {property.bathrooms != null && (
            <span className="flex items-center gap-1">
              <FactIcon kind="bath" /> {property.bathrooms} Bath
            </span>
          )}
          {property.areaSqft != null && (
            <span className="flex items-center gap-1">
              <FactIcon kind="area" /> {property.areaSqft} sqft
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
