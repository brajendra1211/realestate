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
  const image = property.images[0]?.url || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80";
  const pricePerSqft = property.areaSqft && property.listingType === "SALE"
    ? Math.round(property.price / property.areaSqft)
    : null;

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl">
      {/* Property Image Container */}
      <Link href={`/properties/${property.slug}`} className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 block">
        <Image
          src={image}
          alt={property.title}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
          sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 90vw"
        />

        {/* Soft Vignette Gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

        {/* Top Badges */}
        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <span
            className={`rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wider uppercase backdrop-blur-md ${
              property.listingType === "SALE"
                ? "bg-slate-900/90 text-white"
                : "bg-blue-600/90 text-white"
            }`}
          >
            {property.listingType === "SALE" ? "For Sale" : "For Rent"}
          </span>

          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600/90 px-2 py-1 text-[11px] font-bold text-white backdrop-blur-md">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
            Verified
          </span>
        </div>

        {/* Price on Image corner */}
        <div className="absolute bottom-3 left-3.5 right-3.5 flex items-end justify-between text-white">
          <div>
            <div className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-sm">
              {formatPrice(property.price, property.listingType)}
            </div>
            {pricePerSqft && (
              <div className="text-[11px] text-slate-300 font-medium">
                ≈ ₹ {pricePerSqft.toLocaleString("en-IN")}/sq.ft
              </div>
            )}
          </div>
          <span className="rounded bg-black/60 px-2 py-1 text-[10px] font-bold tracking-wider uppercase text-slate-200 backdrop-blur-xs">
            {PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType}
          </span>
        </div>
      </Link>

      {/* Property Details Body */}
      <div className="flex flex-1 flex-col justify-between p-4 space-y-3">
        <div>
          {/* Location / Sector */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1">
            <svg className="h-3.5 w-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

        {/* Specs Badges with Clean SVG Icons (No Emojis) */}
        <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
          {property.bedrooms ? (
            <div className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>{property.bedrooms} BHK</span>
            </div>
          ) : null}

          {property.bathrooms ? (
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
              <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.038 8.038 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{property.bathrooms} Baths</span>
            </div>
          ) : null}

          {property.areaSqft ? (
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-2">
              <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              <span>{property.areaSqft.toLocaleString("en-IN")} sq.ft</span>
            </div>
          ) : null}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <Link
            href={`/properties/${property.slug}`}
            className="flex-1 rounded-lg bg-slate-900 hover:bg-blue-600 text-white py-2.5 text-center text-xs font-bold transition"
          >
            View Details
          </Link>
          <a
            href={`https://wa.me/919876543210?text=Hello,%20I%20am%20interested%20in%20${encodeURIComponent(property.title)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-2.5 text-xs font-bold transition flex items-center gap-1.5 shrink-0"
            title="Chat on WhatsApp"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.353.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.173.086.275.072.376-.044.101-.116.433-.506.549-.679.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.073.043.419-.101.824z" />
            </svg>
            <span>WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}
