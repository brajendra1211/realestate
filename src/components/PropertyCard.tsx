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
    <Link
      href={`/properties/${property.slug}`}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {image ? (
          <Image
            src={image}
            alt={property.title}
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
            sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            No photo
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
            {property.listingType === "SALE" ? "For Sale" : "For Rent"}
          </span>
          {property.condition && (
            <span className="rounded-full bg-amber-50/95 px-2.5 py-1 text-xs font-semibold text-amber-700 shadow-sm">
              {property.condition === "NEW_BOOKING" ? "New" : "Resale"}
            </span>
          )}
        </div>
      </div>
      <div className="space-y-1.5 p-4">
        <p className="text-lg font-semibold text-slate-900">
          {formatPrice(property.price, property.listingType)}
        </p>
        <h3 className="truncate font-medium text-slate-800">{property.title}</h3>
        <p className="truncate text-sm text-slate-500">
          {[property.locality, property.city].filter(Boolean).join(", ")}
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-xs text-slate-500">
          <span>{PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType}</span>
          {property.bedrooms != null && <span>{property.bedrooms} Bed</span>}
          {property.bathrooms != null && <span>{property.bathrooms} Bath</span>}
          {property.areaSqft != null && <span>{property.areaSqft} sqft</span>}
        </div>
      </div>
    </Link>
  );
}
