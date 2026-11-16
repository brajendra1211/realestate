import { BannerBackground } from "@/components/ui/PageBanner";
import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PropertyCard } from "@/components/PropertyCard";
import { JsonLd } from "@/components/JsonLd";
import { absoluteUrl } from "@/lib/seo";
import { PUBLIC_LISTER_FILTER, notExpiredFilter } from "@/lib/propertyVisibility";
import { getLocationCookie } from "@/lib/location-context";
import type { Prisma } from "@/generated/prisma/client";
import { Stagger, StaggerItem } from "@/components/ui/Motion";
import { Building2, Home as HomeIcon, BedDouble, Briefcase, ChevronRight, SlidersHorizontal, ShieldCheck, SearchX } from "lucide-react";

type SearchParams = Promise<{
  city?: string;
  listingType?: string;
  propertyType?: string;
  condition?: string;
  minPrice?: string;
  maxPrice?: string;
  bedrooms?: string;
  furnishing?: string;
}>;

const POPULAR_METROS = [
  "Delhi NCR",
  "Gurgaon",
  "Noida",
  "Bengaluru",
  "Mumbai",
  "Hyderabad",
  "Pune",
  "Dubai",
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
  const place = effectiveCity ? ` in ${effectiveCity}` : " Across India & Global Metros";
  const title = `Properties ${action}${place} | Pronesto`;
  const description = `Browse 100% verified properties ${action.toLowerCase()}${place} — luxury apartments, co-living PGs, villas, and commercial spaces.`;

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
  const activeListingType = params.listingType === "SALE" ? "SALE" : params.listingType === "RENT" ? "RENT" : "ALL";

  const where: Prisma.PropertyWhereInput = {
    approvalStatus: "APPROVED",
    status: "AVAILABLE",
    owner: PUBLIC_LISTER_FILTER,
    AND: [notExpiredFilter()],
  };

  if (effectiveCity && effectiveCity !== "All Cities") {
    where.OR = [
      { city: { contains: effectiveCity } },
      { locality: { contains: effectiveCity } },
    ];
  }
  if (params.listingType === "SALE" || params.listingType === "RENT") {
    where.listingType = params.listingType;
  }
  if (params.propertyType === "COMMERCIAL") {
    where.propertyType = { in: ["COMMERCIAL", "OFFICE", "SHOP", "WAREHOUSE"] } as Prisma.PropertyWhereInput["propertyType"];
  } else if (params.propertyType) {
    where.propertyType = params.propertyType as Prisma.PropertyWhereInput["propertyType"];
  }
  if (params.condition === "NEW_BOOKING" || params.condition === "RESALE") {
    where.condition = params.condition;
  }
  if (params.furnishing) {
    where.furnishing = params.furnishing;
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

  const agentListingWhere: Prisma.AgentListingWhereInput = {
    approvalStatus: "APPROVED",
    isDelisted: false,
    OR: [{ listingExpiresAt: null }, { listingExpiresAt: { gt: new Date() } }],
  };
  if (params.listingType === "SALE" || params.listingType === "RENT") {
    agentListingWhere.listingType = params.listingType;
  }
  if (params.propertyType === "COMMERCIAL") {
    agentListingWhere.propertyType = { in: ["COMMERCIAL", "OFFICE", "SHOP", "WAREHOUSE"] } as Prisma.AgentListingWhereInput["propertyType"];
  } else if (params.propertyType) {
    agentListingWhere.propertyType = params.propertyType as Prisma.AgentListingWhereInput["propertyType"];
  }
  if (params.furnishing) {
    agentListingWhere.furnishing = params.furnishing;
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
  if (effectiveCity && effectiveCity !== "All Cities") {
    agentListingWhere.masterProperty = {
      OR: [{ city: { contains: effectiveCity } }, { locality: { contains: effectiveCity } }],
    };
  }

  const skipAgentListings = params.condition === "NEW_BOOKING" || params.condition === "RESALE";

  const [websiteProperties, agentListings] = await Promise.all([
    prisma.property.findMany({
      where,
      include: { images: { orderBy: { order: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    skipAgentListings
      ? Promise.resolve([])
      : prisma.agentListing.findMany({
          where: agentListingWhere,
          include: {
            images: { orderBy: { order: "asc" } },
            masterProperty: { select: { city: true, locality: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 80,
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
      carpetAreaSqft: p.carpetAreaSqft,
      superAreaSqft: p.superAreaSqft,
      commercialSubtype: p.commercialSubtype,
      pgGender: p.pgGender,
      pgSharing: p.pgSharing,
      foodIncluded: p.foodIncluded,
      furnishing: p.furnishing,
      floorNumber: p.floorNumber,
      totalFloors: p.totalFloors,
      facingDirection: p.facingDirection,
      maintenanceCharges: p.maintenanceCharges,
      securityDeposit: p.securityDeposit,
      possessionStatus: p.possessionStatus,
      bachelorFriendly: p.bachelorFriendly,
      reraNumber: p.reraNumber,
      societyName: p.societyName,
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
      carpetAreaSqft: l.carpetAreaSqft,
      superAreaSqft: l.superAreaSqft,
      commercialSubtype: l.commercialSubtype,
      pgGender: l.pgGender,
      pgSharing: l.pgSharing,
      foodIncluded: l.foodIncluded,
      furnishing: l.furnishing,
      floorNumber: l.floorNumber,
      totalFloors: l.totalFloors,
      facingDirection: l.facingDirection,
      maintenanceCharges: l.maintenanceCharges,
      securityDeposit: l.securityDeposit,
      possessionStatus: null,
      bachelorFriendly: l.bachelorFriendly,
      reraNumber: null,
      societyName: l.societyName,
      images: l.images,
      createdAt: l.createdAt,
      detailHref: `/listings/${l.slug}`,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Verified Real Estate in India",
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

  // Each entry point shows only its own world: Buy shows only sale, Rent only rent,
  // Commercial only commercial, PG only PG. Only the plain "all properties" view mixes them.
  const COMMERCIAL_TYPES = ["COMMERCIAL", "OFFICE", "SHOP", "WAREHOUSE"];
  const isPgMode = params.propertyType === "PG";
  const isCommercialMode = !!params.propertyType && COMMERCIAL_TYPES.includes(params.propertyType);
  const isRentMode = !isPgMode && !isCommercialMode && activeListingType === "RENT";
  const isBuyMode = !isPgMode && !isCommercialMode && activeListingType === "SALE";
  const isFocused = isPgMode || isCommercialMode || isRentMode || isBuyMode;

  const hrefFor = (extra: Record<string, string>) =>
    `/properties?${new URLSearchParams({
      ...(params.city ? { city: params.city } : {}),
      ...extra,
    }).toString()}`;

  const categoryPills: { label: string; type: string; listing: string; icon: React.ReactNode }[] = isPgMode
    ? []
    : isCommercialMode
    ? [
        { label: "Offices", type: "OFFICE", listing: "", icon: <Briefcase className="h-3.5 w-3.5" /> },
        { label: "Shops & showrooms", type: "SHOP", listing: "", icon: <Building2 className="h-3.5 w-3.5" /> },
        { label: "Warehouses", type: "WAREHOUSE", listing: "", icon: <Building2 className="h-3.5 w-3.5" /> },
      ]
    : isBuyMode
    ? [
        { label: "Luxury flats & penthouses", type: "APARTMENT", listing: "SALE", icon: <Building2 className="h-3.5 w-3.5" /> },
        { label: "Golf & pool villas", type: "VILLA", listing: "SALE", icon: <HomeIcon className="h-3.5 w-3.5" /> },
      ]
    : [
        { label: "Flats & apartments", type: "APARTMENT", listing: "RENT", icon: <Building2 className="h-3.5 w-3.5" /> },
        { label: "PG & co-living", type: "PG", listing: "", icon: <BedDouble className="h-3.5 w-3.5" /> },
        { label: "Commercial", type: "COMMERCIAL", listing: "", icon: <Briefcase className="h-3.5 w-3.5" /> },
        { label: "Villas", type: "VILLA", listing: "RENT", icon: <HomeIcon className="h-3.5 w-3.5" /> },
        { label: "Independent floors", type: "INDEPENDENT_HOUSE", listing: "RENT", icon: <Building2 className="h-3.5 w-3.5" /> },
      ];

  const showCategory = !isPgMode && !isCommercialMode;
  const showBedrooms = !isPgMode && !isCommercialMode;

  const fieldCls =
    "w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3 text-sm font-semibold text-ink outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100";
  const labelCls = "mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400";

  const modeTabs = [
    { key: "ALL", label: `All (${properties.length})`, href: "/properties" },
    { key: "RENT", label: "For rent", href: "/properties?listingType=RENT" },
    { key: "SALE", label: "For sale", href: "/properties?listingType=SALE" },
  ];

  return (
    <div className="min-h-screen bg-slate-50/70 pb-24">
      <JsonLd data={collectionJsonLd} />

      {/* Header */}
      <div className="relative isolate overflow-hidden bg-brand-950 pb-16 pt-10 text-white">
        <BannerBackground art={isBuyMode || isCommercialMode ? "buy" : isRentMode || isPgMode ? "rent" : "home"} />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <Link href="/" className="transition hover:text-white">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gold-300">
              {isBuyMode ? "Buy" : isRentMode ? "Rent" : isCommercialMode ? "Commercial" : isPgMode ? "PG / Co-living" : "All properties"}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">
                {isBuyMode ? (
                  <>Curated homes <span className="text-gradient-gold italic">for sale</span></>
                ) : isCommercialMode ? (
                  <>Commercial <span className="text-gradient-gold italic">spaces</span></>
                ) : isPgMode ? (
                  <>PG &amp; <span className="text-gradient-gold italic">co-living</span></>
                ) : isRentMode ? (
                  <>Verified <span className="text-gradient-gold italic">rentals</span></>
                ) : (
                  <>Explore every <span className="text-gradient-gold italic">verified</span> property</>
                )}
              </h1>
              <p className="mt-3 text-sm text-slate-300 sm:text-base">
                {isBuyMode
                  ? "Admin-audited title, clear RERA credentials and platform escrow protection."
                  : isCommercialMode
                  ? "Offices, shops, showrooms and warehouses from verified owners and partners."
                  : isPgMode
                  ? "Paying guest and co-living stays with transparent rent and meals info."
                  : "Direct owner and partner connects, 0% brokerage and transparent deposits."}
              </p>
            </div>

            {!isFocused && (
            <div className="glass-dark flex items-center gap-1 rounded-full border border-white/10 p-1">
              {modeTabs.map((t) => (
                <Link
                  key={t.key}
                  href={t.href}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                    activeListingType === t.key ? "bg-white text-ink shadow" : "text-slate-300 hover:text-white"
                  }`}
                >
                  {t.label}
                </Link>
              ))}
            </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-8 max-w-7xl px-4 sm:px-6">
        {/* Filter console */}
        <form
          method="get"
          className="relative grid grid-cols-1 gap-3 rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-12"
        >
          {params.listingType && <input type="hidden" name="listingType" value={params.listingType} />}
          {(isPgMode || isCommercialMode) && <input type="hidden" name="propertyType" value={params.propertyType} />}

          <div className={showCategory ? "lg:col-span-3" : "lg:col-span-5"}>
            <label className={labelCls}>City / metro</label>
            <select name="city" defaultValue={effectiveCity ?? ""} className={fieldCls}>
              <option value="">All metros</option>
              {POPULAR_METROS.map((metro) => (
                <option key={metro} value={metro}>{metro}</option>
              ))}
            </select>
          </div>
          {showCategory && (
          <div className="lg:col-span-3">
            <label className={labelCls}>Category</label>
            <select name="propertyType" defaultValue={params.propertyType ?? ""} className={fieldCls}>
              <option value="">All categories</option>
              {!isBuyMode && !isRentMode && <option value="APARTMENT">Flats / Apartments</option>}
              {isBuyMode && <option value="APARTMENT">Luxury flats &amp; penthouses</option>}
              {isRentMode && <option value="APARTMENT">Flats / Apartments</option>}
              {!isBuyMode && <option value="PG">PG / Co-Living</option>}
              {!isBuyMode && <option value="COMMERCIAL">Commercial (Office/Shop/Warehouse)</option>}
              <option value="VILLA">Luxury Villas</option>
              {!isBuyMode && <option value="INDEPENDENT_HOUSE">Independent Houses</option>}
            </select>
          </div>
          )}
          {showBedrooms && (
          <div className="lg:col-span-2">
            <label className={labelCls}>Bedrooms</label>
            <select name="bedrooms" defaultValue={params.bedrooms ?? ""} className={fieldCls}>
              <option value="">Any BHK</option>
              <option value="1">1+ BHK</option>
              <option value="2">2+ BHK</option>
              <option value="3">3+ BHK</option>
              <option value="4">4+ BHK</option>
            </select>
          </div>
          )}
          <div className={showCategory ? "lg:col-span-2" : "lg:col-span-5"}>
            <label className={labelCls}>Furnishing</label>
            <select name="furnishing" defaultValue={params.furnishing ?? ""} className={fieldCls}>
              <option value="">Any</option>
              <option value="FURNISHED">Fully furnished</option>
              <option value="SEMI_FURNISHED">Semi-furnished</option>
              <option value="UNFURNISHED">Unfurnished</option>
            </select>
          </div>
          <div className="flex flex-col justify-end lg:col-span-2">
            <button
              type="submit"
              className="shine inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/25 transition hover:brightness-110"
            >
              <SlidersHorizontal className="h-4 w-4" /> Apply
            </button>
          </div>
        </form>

        {/* Category pills */}
        {categoryPills.length > 0 && (
        <div className="no-scrollbar mt-6 flex items-center gap-2 overflow-x-auto pb-2">
          <Link
            href={
              isCommercialMode
                ? hrefFor({ propertyType: "COMMERCIAL" })
                : hrefFor(params.listingType ? { listingType: params.listingType } : {})
            }
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
              !params.propertyType || (isCommercialMode && params.propertyType === "COMMERCIAL")
                ? "bg-ink text-white shadow"
                : "border border-slate-200 bg-white text-slate-700 hover:border-brand-600 hover:text-brand-700"
            }`}
          >
            {isCommercialMode ? "All commercial" : "All categories"}
          </Link>
          {categoryPills.map((c) => (
            <Link
              key={c.type}
              href={hrefFor({ ...(c.listing ? { listingType: c.listing } : {}), propertyType: c.type })}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                params.propertyType === c.type
                  ? "bg-brand-600 text-white shadow"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-brand-600 hover:text-brand-700"
              }`}
            >
              {c.icon}
              {c.label}
            </Link>
          ))}
        </div>
        )}

        {/* Results header */}
        <div className="mb-6 mt-4 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-500">
            Showing <span className="font-bold text-ink">{properties.length}</span> verified{" "}
            {properties.length === 1 ? "property" : "properties"}
            {effectiveCity ? <> in <span className="font-bold text-ink">{effectiveCity}</span></> : null}
          </p>
          <div className="hidden items-center gap-1.5 text-xs font-semibold text-emerald-700 sm:flex">
            <ShieldCheck className="h-4 w-4" />
            Anti-bypass legal protection
          </div>
        </div>

        {/* Grid */}
        {properties.length > 0 ? (
          <Stagger className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" gap={0.05}>
            {properties.map((property) => (
              <StaggerItem key={property.detailHref}>
                <PropertyCard property={property} />
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-14 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <SearchX className="h-8 w-8" />
            </div>
            <h3 className="font-display text-2xl font-semibold text-ink">No properties match your filters</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
              Try broadening your search or clearing filters to see all available verified inventory.
            </p>
            <Link
              href="/properties"
              className="mt-6 inline-flex rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              Clear all filters
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
