import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, BedDouble, Bath, Maximize2, MapPin, Sofa, ShieldCheck, Images } from "lucide-react";
import {
  formatPrice,
  PROPERTY_TYPE_LABELS,
  COMMERCIAL_SUBTYPE_LABELS,
  PG_SHARING_LABELS,
} from "@/lib/format";

export type PropertyCardData = {
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
  carpetAreaSqft?: number | null;
  superAreaSqft?: number | null;
  commercialSubtype?: string | null;
  pgGender?: string | null;
  pgSharing?: string | null;
  foodIncluded?: boolean;
  furnishing?: string | null;
  floorNumber?: number | null;
  totalFloors?: number | null;
  facingDirection?: string | null;
  maintenanceCharges?: number | null;
  securityDeposit?: number | null;
  possessionStatus?: string | null;
  bachelorFriendly?: boolean;
  reraNumber?: string | null;
  societyName?: string | null;
  images: { url: string }[];
  detailHref?: string;
};

export function PropertyCard({ property }: { property: PropertyCardData }) {
  const href = property.detailHref ?? `/properties/${property.slug}`;
  const image =
    property.images[0]?.url ||
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80";

  const effectiveArea = property.superAreaSqft ?? property.areaSqft ?? property.carpetAreaSqft;
  const pricePerSqft =
    effectiveArea && property.listingType === "SALE"
      ? Math.round(property.price / effectiveArea)
      : null;

  const getSubcategory = () => {
    if (property.propertyType === "PG") {
      const g = property.pgGender === "MALE" ? "Boys" : property.pgGender === "FEMALE" ? "Girls" : "Co-Living";
      const s = property.pgSharing ? (PG_SHARING_LABELS[property.pgSharing] ?? property.pgSharing) : "PG";
      return `${g} PG · ${s}`;
    }
    if (property.propertyType === "COMMERCIAL" || property.propertyType === "SHOP" || property.propertyType === "WAREHOUSE") {
      return property.commercialSubtype ? (COMMERCIAL_SUBTYPE_LABELS[property.commercialSubtype] ?? property.commercialSubtype) : "Commercial";
    }
    if (property.bedrooms) {
      return `${property.bedrooms} BHK ${PROPERTY_TYPE_LABELS[property.propertyType] ?? "Property"}`;
    }
    return PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType;
  };

  const isRent = property.listingType === "RENT";
  const locationText = property.locality ? `${property.locality}, ${property.city}` : property.city;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-soft transition-all duration-500 ease-out hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-lift">
      {/* Media */}
      <Link href={href} className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <Image
          src={image}
          alt={property.title}
          fill
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
          sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 90vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-ink/10 opacity-80 transition-opacity duration-500 group-hover:opacity-100" />

        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm ${
                isRent ? "bg-brand-600" : "bg-gradient-to-r from-gold-500 to-gold-400 text-ink"
              }`}
            >
              {isRent ? "For Rent" : "For Sale"}
            </span>
            {property.reraNumber && (
              <span className="glass-dark inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-white">
                <ShieldCheck className="h-3 w-3" /> RERA
              </span>
            )}
          </div>
          <span className="glass inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold text-emerald-700">
            <BadgeCheck className="h-3.5 w-3.5" /> Verified
          </span>
        </div>

        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex items-end justify-between">
          <div className="text-white">
            <div className="font-display text-2xl font-semibold leading-none drop-shadow">
              {formatPrice(property.price, property.listingType)}
            </div>
            {(pricePerSqft || property.securityDeposit) && (
              <div className="mt-1 text-[11px] font-medium text-white/80">
                {pricePerSqft
                  ? `₹${pricePerSqft.toLocaleString("en-IN")}/sq.ft`
                  : `Deposit ₹${property.securityDeposit!.toLocaleString("en-IN")}`}
              </div>
            )}
          </div>
          <span className="glass-dark inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold text-white">
            <Images className="h-3 w-3" /> {property.images.length || 1}
          </span>
        </div>
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600">
          {getSubcategory()}
        </div>
        <Link href={href}>
          <h3 className="mt-1 line-clamp-1 text-base font-bold leading-snug text-ink transition-colors group-hover:text-brand-600">
            {property.title}
          </h3>
        </Link>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{locationText}</span>
        </div>

        {/* Spec chips */}
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
          {property.propertyType === "PG" ? (
            <>
              <Chip>{property.foodIncluded ? "Meals included" : "Self-catering"}</Chip>
              {property.furnishing && <Chip icon={<Sofa className="h-3.5 w-3.5" />}>{property.furnishing.replace(/_/g, " ").toLowerCase()}</Chip>}
            </>
          ) : (
            <>
              {property.bedrooms ? <Chip icon={<BedDouble className="h-3.5 w-3.5" />}>{property.bedrooms} Beds</Chip> : null}
              {property.bathrooms ? <Chip icon={<Bath className="h-3.5 w-3.5" />}>{property.bathrooms} Baths</Chip> : null}
              {effectiveArea ? (
                <Chip icon={<Maximize2 className="h-3.5 w-3.5" />}>{effectiveArea.toLocaleString("en-IN")} sqft</Chip>
              ) : null}
              {property.furnishing && !property.bedrooms ? (
                <Chip icon={<Sofa className="h-3.5 w-3.5" />}>{property.furnishing.replace(/_/g, " ").toLowerCase()}</Chip>
              ) : null}
            </>
          )}
        </div>

      </div>
    </article>
  );
}

function Chip({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 capitalize ring-1 ring-inset ring-slate-200/70">
      {icon && <span className="text-brand-600">{icon}</span>}
      {children}
    </span>
  );
}
