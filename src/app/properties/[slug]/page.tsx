import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  formatPrice,
  formatIndianShortPrice,
  parseVideoUrls,
  getVideoEmbed,
  PROPERTY_TYPE_LABELS,
  COMMERCIAL_SUBTYPE_LABELS,
  PG_SHARING_LABELS,
  FURNISHING_LABELS,
} from "@/lib/format";
import { absoluteUrl } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { PropertyGallery } from "@/components/PropertyGallery";
import { isOwnerPublic, isPropertyExpired } from "@/lib/propertyVisibility";
import { toggleSavedProperty } from "@/app/buyer/actions";
import { EnquiryForm } from "./EnquiryForm";
import { getSiteSettings } from "@/lib/site-settings";
import { Reveal, Stagger, StaggerItem } from "@/components/ui/Motion";
import {
  BadgeCheck,
  BedDouble,
  Building2,
  Check,
  ChevronRight,
  FileText,
  Heart,
  ListChecks,
  PlayCircle,
  Sparkles,
  Video,
  Landmark,
  MapPin,
  Maximize2,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sofa,
  Users,
} from "lucide-react";

type Params = Promise<{ slug: string }>;

async function getProperty(slug: string) {
  const property = await prisma.property.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { order: "asc" } },
      owner: {
        select: {
          name: true,
          phone: true,
          email: true,
          company: true,
          role: true,
          slug: true,
          verified: true,
        },
      },
      project: { select: { name: true, slug: true, reraNumber: true } },
    },
  });
  if (!property || !isOwnerPublic(property.owner) || isPropertyExpired(property.expiresAt)) {
    return null;
  }
  return property;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const property = await getProperty(slug);
  if (!property || property.approvalStatus !== "APPROVED") return {};

  const locationLabel = [property.locality, property.city].filter(Boolean).join(", ");
  const action = property.listingType === "SALE" ? "for Sale" : "for Rent";
  const title = `${property.title} ${action} in ${locationLabel} — ${formatPrice(property.price, property.listingType)}`;
  const description =
    property.metaDescription ??
    `${PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType} ${action} in ${locationLabel}. ${property.description.slice(0, 140)}`;
  const image = property.images[0]?.url;
  const url = absoluteUrl(`/properties/${property.slug}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function PropertyDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const property = await getProperty(slug);

  if (!property || property.approvalStatus !== "APPROVED") {
    notFound();
  }

  const session = await auth();
  const isBuyer = session?.user.role === "BUYER";
  const [buyer, isSaved] = await Promise.all([
    isBuyer ? prisma.user.findUnique({ where: { id: session!.user.id } }) : null,
    isBuyer
      ? prisma.savedProperty.findUnique({
          where: { userId_propertyId: { userId: session!.user.id, propertyId: property.id } },
        })
      : null,
  ]);

  const effectiveArea = property.superAreaSqft ?? property.areaSqft ?? property.carpetAreaSqft;
  const pricePerSqft =
    effectiveArea && property.listingType === "SALE"
      ? Math.round(property.price / effectiveArea)
      : null;

  const approxEmi =
    property.listingType === "SALE" && property.price >= 1000000
      ? Math.round((property.price * 0.8 * 86.78) / 10000)
      : null;

  const videoUrls = parseVideoUrls(property.youtubeUrl);
  const videoEmbeds = videoUrls.map(getVideoEmbed);

  const formattedDeposit = property.securityDeposit
    ? `₹${property.securityDeposit >= 100000 ? `${(property.securityDeposit / 100000).toFixed(1)}L` : `${Math.round(property.securityDeposit / 1000)}K`} deposit`
    : "";

  const listingJsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.title,
    description: property.description,
    url: absoluteUrl(`/properties/${property.slug}`),
    datePosted: property.createdAt.toISOString(),
    image: property.images.map((image) => image.url),
    address: {
      "@type": "PostalAddress",
      addressLocality: property.locality ?? property.city,
      addressRegion: property.city,
      addressCountry: "IN",
    },
    offers: {
      "@type": "Offer",
      price: property.price,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    },
  };

  const settings = await getSiteSettings();
  const waDigits = settings.whatsappNumber?.replace(/\D/g, "") ?? "";
  const ownerPhone = property.owner.phone?.trim() || null;
  const listerLabel = property.owner.role === "OWNER" ? "Owner" : "Partner";
  const isRent = property.listingType === "RENT";

  const amenityList = (property.amenities ?? "")
    .split(/[,\n]/)
    .map((a) => a.trim())
    .filter(Boolean);

  const floorText =
    property.floorNumber != null
      ? property.floorNumber === 0
        ? property.totalFloors
          ? `Ground of ${property.totalFloors} floors`
          : "Ground floor"
        : property.totalFloors
          ? `Floor ${property.floorNumber} of ${property.totalFloors}`
          : `Floor ${property.floorNumber}`
      : null;

  // Only real data is shown — rows without a value are simply omitted.
  const keyFacts: { icon: React.ReactNode; label: string; value: string }[] = (
    [
      {
        icon: <BedDouble className="h-5 w-5" />,
        label: "Configuration",
        value: property.bedrooms
          ? `${property.bedrooms} Bed${property.bedrooms > 1 ? "s" : ""}${property.bathrooms ? `, ${property.bathrooms} Bath${property.bathrooms > 1 ? "s" : ""}` : ""}`
          : (PROPERTY_TYPE_LABELS[property.propertyType] ?? ""),
      },
      {
        icon: <Maximize2 className="h-5 w-5" />,
        label: property.superAreaSqft ? "Super area" : "Area",
        value: effectiveArea ? `${effectiveArea.toLocaleString("en-IN")} sqft` : "",
      },
      {
        icon: <Sofa className="h-5 w-5" />,
        label: "Furnishing",
        value: property.furnishing ? (FURNISHING_LABELS[property.furnishing] ?? property.furnishing) : "",
      },
      { icon: <Building2 className="h-5 w-5" />, label: "Floor", value: floorText ?? "" },
      {
        icon: <Users className="h-5 w-5" />,
        label: "Suitable for",
        value: isRent ? (property.bachelorFriendly ? "Family & bachelors" : "Family") : "",
      },
    ] as { icon: React.ReactNode; label: string; value: string }[]
  ).filter((f) => f.value);

  const detailRows: [string, string][] = (
    [
      [isRent ? "Monthly rent" : "Price", formatPrice(property.price, property.listingType) + (property.maintenanceCharges ? `  ·  ₹${property.maintenanceCharges.toLocaleString("en-IN")} maintenance` : "")],
      ["Security deposit", property.securityDeposit ? `₹${property.securityDeposit.toLocaleString("en-IN")}` : ""],
      ["Price per sq.ft", pricePerSqft ? `₹${pricePerSqft.toLocaleString("en-IN")}` : ""],
      ["Possession", property.possessionStatus ? property.possessionStatus.replace(/_/g, " ").toLowerCase() : ""],
      ["Society / project", property.societyName ?? property.project?.name ?? ""],
      ["RERA number", property.reraNumber ?? property.project?.reraNumber ?? ""],
      ["PG sharing", property.propertyType === "PG" && property.pgSharing ? (PG_SHARING_LABELS[property.pgSharing] ?? property.pgSharing) : ""],
      ["PG for", property.propertyType === "PG" && property.pgGender ? (property.pgGender === "MALE" ? "Boys" : property.pgGender === "FEMALE" ? "Girls" : "Co-living") : ""],
      ["Meals", property.propertyType === "PG" ? (property.foodIncluded ? "Included" : "Not included") : ""],
      [
        "Commercial type",
        property.commercialSubtype ? (COMMERCIAL_SUBTYPE_LABELS[property.commercialSubtype] ?? property.commercialSubtype) : "",
      ],
      ["Address", [property.societyName, property.locality, property.city].filter(Boolean).join(", ")],
    ] as [string, string][]
  ).filter(([, v]) => v);

  const rowCls = "grid grid-cols-1 gap-1 py-3.5 sm:grid-cols-12 sm:gap-4";

  const FACT_TONES = [
    { tile: "bg-sky-50 border-sky-100", icon: "bg-sky-500" },
    { tile: "bg-amber-50 border-amber-100", icon: "bg-amber-500" },
    { tile: "bg-emerald-50 border-emerald-100", icon: "bg-emerald-500" },
    { tile: "bg-violet-50 border-violet-100", icon: "bg-violet-500" },
    { tile: "bg-rose-50 border-rose-100", icon: "bg-rose-500" },
    { tile: "bg-cyan-50 border-cyan-100", icon: "bg-cyan-500" },
  ];
  const CHIP_TONES = [
    "bg-sky-50 text-sky-800 border-sky-100",
    "bg-emerald-50 text-emerald-800 border-emerald-100",
    "bg-amber-50 text-amber-800 border-amber-100",
    "bg-violet-50 text-violet-800 border-violet-100",
    "bg-rose-50 text-rose-800 border-rose-100",
    "bg-cyan-50 text-cyan-800 border-cyan-100",
  ];
  const sectionCls = "overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-soft";
  const SectionTitle = ({ icon, tone, children }: { icon: React.ReactNode; tone: string; children: React.ReactNode }) => (
    <h2 className="flex items-center gap-3 font-display text-2xl font-semibold">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md ${tone}`}>{icon}</span>
      {children}
    </h2>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-brand-50/60 via-slate-50 to-white pb-24 text-ink">
      <JsonLd data={listingJsonLd} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[460px] bg-gradient-to-br from-brand-100/80 via-gold-50/70 to-transparent" />
      <div className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-gold-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-40 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" />

      {/* Breadcrumbs */}
      <div className="relative border-b border-white/60 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 text-xs text-slate-500 sm:px-6 lg:px-8">
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
            <Link href="/" className="transition hover:text-brand-600">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href={`/properties?city=${encodeURIComponent(property.city)}`} className="transition hover:text-brand-600">
              {isRent ? "For rent" : "For sale"} in {property.city}
            </Link>
            {property.locality && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span className="max-w-[200px] truncate font-medium text-slate-700">{property.locality}</span>
              </>
            )}
            <ChevronRight className="h-3 w-3" />
            <span className="max-w-[240px] truncate font-semibold text-ink">{property.title}</span>
          </div>
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        {/* Title row */}
        <Reveal className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0 max-w-3xl">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${isRent ? "bg-brand-600 text-white" : "bg-gradient-to-r from-gold-500 to-gold-400 text-ink"}`}>
                {isRent ? "For rent" : "For sale"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                <BadgeCheck className="h-3.5 w-3.5" /> Verified listing
              </span>
              {(property.reraNumber || property.project?.reraNumber) && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-bold text-white">
                  <ShieldCheck className="h-3.5 w-3.5" /> RERA
                </span>
              )}
            </div>
            <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">{property.title}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
              <MapPin className="h-4 w-4 shrink-0 text-brand-600" />
              {[property.societyName, property.locality, property.city].filter(Boolean).join(", ")}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {videoEmbeds.length > 0 && (
              <a
                href="#video"
                className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-600/25 transition hover:bg-rose-700"
              >
                <PlayCircle className="h-4 w-4" /> Watch video tour
              </a>
            )}
            {isBuyer ? (
              <form action={toggleSavedProperty}>
                <input type="hidden" name="propertyId" value={property.id} />
                <input type="hidden" name="redirectTo" value={`/properties/${property.slug}`} />
                <button
                  type="submit"
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                    isSaved ? "border-rose-300 bg-rose-50 text-rose-600" : "border-slate-200 bg-white text-ink hover:border-brand-600"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isSaved ? "fill-rose-500 text-rose-500" : ""}`} />
                  {isSaved ? "Saved" : "Shortlist"}
                </button>
              </form>
            ) : (
              <Link href="/buyer/login" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-brand-600">
                <Heart className="h-4 w-4" /> Shortlist
              </Link>
            )}
          </div>
        </Reveal>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* LEFT */}
          <div className="space-y-6 lg:col-span-8">
            <Reveal>
              <PropertyGallery images={property.images} title={property.title} />
            </Reveal>

            {keyFacts.length > 0 && (
              <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3" gap={0.05}>
                {keyFacts.map((f, i) => (
                  <StaggerItem key={f.label}>
                    <div className={`flex h-full items-center gap-3 rounded-2xl border p-4 shadow-soft ${FACT_TONES[i % FACT_TONES.length].tile}`}>
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md ${FACT_TONES[i % FACT_TONES.length].icon}`}>
                        {f.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{f.label}</div>
                        <div className="truncate text-sm font-bold capitalize">{f.value}</div>
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            )}

            {videoEmbeds.length > 0 && (
              <Reveal>
                <section id="video" className={`${sectionCls} scroll-mt-24`}>
                  <div className="h-1.5 bg-gradient-to-r from-rose-500 via-rose-400 to-amber-400" />
                  <div className="p-6 sm:p-8">
                    <SectionTitle icon={<Video className="h-5 w-5" />} tone="bg-rose-500">Video tour</SectionTitle>
                    <div className={`mt-5 grid gap-4 ${videoEmbeds.length > 1 ? "sm:grid-cols-2" : ""}`}>
                      {videoEmbeds.map((video, idx) => (
                        <div key={idx} className="aspect-video overflow-hidden rounded-2xl bg-black shadow-lift">
                          {video.type === "direct" && video.embedUrl ? (
                            <video src={video.embedUrl} controls preload="metadata" className="h-full w-full" />
                          ) : video.embedUrl ? (
                            <iframe
                              src={video.embedUrl}
                              title={`${property.title} video tour ${idx + 1}`}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              loading="lazy"
                              className="h-full w-full"
                            />
                          ) : (
                            <a
                              href={video.originalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-rose-600 to-rose-800 text-white"
                            >
                              <PlayCircle className="h-12 w-12" />
                              <span className="text-sm font-bold">Open video in a new tab</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </Reveal>
            )}

            {/* Description */}
            <Reveal>
              <section className={sectionCls}>
                <div className="h-1.5 bg-gradient-to-r from-brand-600 to-brand-400" />
                <div className="p-6 sm:p-8">
                  <SectionTitle icon={<FileText className="h-5 w-5" />} tone="bg-brand-600">About this property</SectionTitle>
                  <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-slate-600">{property.description}</p>
                </div>
              </section>
            </Reveal>

            {/* Details */}
            <Reveal>
              <section id="more-details" className={sectionCls}>
                <div className="h-1.5 bg-gradient-to-r from-gold-500 to-gold-300" />
                <div className="p-6 sm:p-8">
                  <SectionTitle icon={<ListChecks className="h-5 w-5" />} tone="bg-gold-500">Property details</SectionTitle>
                  <dl className="mt-3 divide-y divide-slate-100 text-sm">
                    {detailRows.map(([k, v], i) => (
                      <div key={k} className={`${rowCls} ${i % 2 === 0 ? "" : "bg-slate-50/60"} -mx-3 rounded-lg px-3`}>
                        <dt className="font-medium text-slate-500 sm:col-span-4">{k}</dt>
                        <dd className="font-semibold capitalize sm:col-span-8">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </section>
            </Reveal>

            {/* Amenities */}
            {amenityList.length > 0 && (
              <Reveal>
                <section id="amenities" className={sectionCls}>
                  <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-400" />
                  <div className="p-6 sm:p-8">
                    <SectionTitle icon={<Sparkles className="h-5 w-5" />} tone="bg-emerald-500">Amenities</SectionTitle>
                    <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {amenityList.map((a, i) => (
                        <li key={a} className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-semibold ${CHIP_TONES[i % CHIP_TONES.length]}`}>
                          <Check className="h-4 w-4 shrink-0" />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              </Reveal>
            )}

          </div>

          {/* RIGHT — sticky contact */}
          <aside className="lg:col-span-4">
            <div className="space-y-4 lg:sticky lg:top-24">
              <Reveal>
                <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-brand-700 via-brand-600 to-indigo-700 p-6 text-white shadow-lift">
                  <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gold-300/50 blur-3xl" />
                  <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-sky-300/30 blur-3xl" />
                  <div className="relative">
                    <div className="text-xs font-semibold uppercase tracking-wider text-brand-100">{isRent ? "Monthly rent" : "Asking price"}</div>
                    <div className="font-display mt-1 text-4xl font-semibold">{formatPrice(property.price, property.listingType)}</div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
                      {formattedDeposit && <span className="rounded-full bg-white/15 px-3 py-1">{formattedDeposit}</span>}
                      {property.maintenanceCharges ? (
                        <span className="rounded-full bg-white/15 px-3 py-1">+ ₹{property.maintenanceCharges.toLocaleString("en-IN")} maintenance</span>
                      ) : null}
                      {pricePerSqft && <span className="rounded-full bg-gold-400 px-3 py-1 text-ink">₹{pricePerSqft.toLocaleString("en-IN")}/sq.ft</span>}
                    </div>
                    {approxEmi && (
                      <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2.5 text-xs">
                        <Landmark className="h-4 w-4 text-gold-300" />
                        <span>
                          Est. EMI <b className="text-gold-300">{formatIndianShortPrice(approxEmi)}</b>/mo (80% loan, 20 yrs)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Reveal>

              <Reveal delay={0.08}>
                <div id="contact-card" className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-soft">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-400 text-lg font-bold text-white">
                      {(property.contactName ?? property.owner.company ?? property.owner.name).charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Listed by {listerLabel.toLowerCase()}</div>
                      <div className="truncate font-bold">{property.contactName ?? property.owner.company ?? property.owner.name}</div>
                      <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <BadgeCheck className="h-3.5 w-3.5" /> Verified lister
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    {ownerPhone ? (
                      <a href={`tel:${ownerPhone}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand-600 px-3 py-3 text-sm font-bold text-brand-700 transition hover:bg-brand-50">
                        <Phone className="h-4 w-4" /> Call
                      </a>
                    ) : (
                      <span className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold text-slate-400">
                        <Phone className="h-4 w-4" /> Call
                      </span>
                    )}
                    {waDigits ? (
                      <a
                        href={`https://wa.me/${waDigits}?text=${encodeURIComponent(`Hello, I would like to schedule a visit for: ${property.title}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
                      >
                        <MessageCircle className="h-4 w-4" /> WhatsApp
                      </a>
                    ) : (
                      <span className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-3 text-sm font-bold text-slate-400">
                        <MessageCircle className="h-4 w-4" /> WhatsApp
                      </span>
                    )}
                  </div>

                  <div className="mt-5">
                    <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Send enquiry</h4>
                    <EnquiryForm
                      propertyId={property.id}
                      slug={property.slug}
                      defaultName={buyer?.name && buyer.name !== "Buyer" ? buyer.name : undefined}
                      defaultPhone={buyer?.phone ?? undefined}
                      defaultEmail={buyer?.email ?? undefined}
                    />
                  </div>
                </div>
              </Reveal>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
