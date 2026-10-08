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

export function PropertyCard({ property }: { property: PropertyCardData }) {
  const image = property.images[0]?.url;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-900/10">
      {/* Property Image Container */}
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
          <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400 bg-slate-50">
            No photo available
          </div>
        )}

        {/* Soft Vignette Gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />

        {/* Top Badges */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span
            className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold tracking-wide uppercase shadow-sm backdrop-blur-md ${
              property.listingType === "SALE"
                ? "bg-slate-900/90 text-white border border-white/20"
                : "bg-blue-600/90 text-white border border-white/20"
            }`}
          >
            {property.listingType === "SALE" ? "For Sale" : "For Rent"}
          </span>

          <span className="rounded-lg bg-emerald-600/90 text-white px-2 py-1 text-[11px] font-bold tracking-wide shadow-sm backdrop-blur-md flex items-center gap-1 border border-emerald-400/30">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Verified
          </span>

          {property.condition && (
            <span className="rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold text-slate-800 shadow-sm border border-slate-200 backdrop-blur-md">
              {property.condition === "NEW_BOOKING" ? "New Project" : "Resale"}
            </span>
          )}
        </div>

        {/* Price on Image corner */}
        <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-end justify-between text-white">
          <div>
            <div className="text-xl sm:text-2xl font-black tracking-tight drop-shadow-md text-white">
              {formatPrice(property.price, property.listingType)}
            </div>
            {property.listingType === "SALE" && property.areaSqft && (
              <div className="text-[11px] text-slate-200 font-semibold drop-shadow-sm">
                ≈ ₹{Math.round(property.price / property.areaSqft).toLocaleString("en-IN")}/sq.ft
              </div>
            )}
          </div>
          <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold tracking-wider text-slate-200 uppercase backdrop-blur-xs border border-white/10">
            {PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType}
          </span>
        </div>
      </Link>

      {/* Property Details Body */}
      <div className="flex flex-1 flex-col justify-between p-4 space-y-3">
        <div>
          {/* Location / Sector */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1">
            <svg className="h-3.5 w-3.5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{property.locality ? `${property.locality}, ${property.city}` : property.city}</span>
          </div>

          {/* Property Title */}
          <Link href={`/properties/${property.slug}`} className="block">
            <h3 className="line-clamp-2 text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition leading-snug">
              {property.title}
            </h3>
          </Link>
        </div>

        {/* Specs Badges (Beds, Baths, Area) */}
        <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
          {property.bedrooms ? (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">🛏️</span>
              <span>{property.bedrooms} Beds</span>
            </div>
          ) : null}

          {property.bathrooms ? (
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
              <span className="text-slate-400">🚿</span>
              <span>{property.bathrooms} Baths</span>
            </div>
          ) : null}

          {property.areaSqft ? (
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
              <span className="text-slate-400">📐</span>
              <span>{property.areaSqft.toLocaleString("en-IN")} sq.ft</span>
            </div>
          ) : null}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
          <Link
            href={`/properties/${property.slug}`}
            className="flex-1 rounded-xl bg-slate-900 hover:bg-blue-600 text-white py-2 text-center text-xs font-bold transition shadow-xs"
          >
            View Details
          </Link>
          <a
            href={`https://wa.me/919876543210?text=Hello,%20I%20am%20interested%20in%20${encodeURIComponent(property.title)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 p-2 text-xs font-bold transition flex items-center justify-center shrink-0"
            title="Chat on WhatsApp"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.353.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.044.101-.116.433-.506.549-.679.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
