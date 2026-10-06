import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice, parseVideoUrls, getVideoEmbed, PROPERTY_TYPE_LABELS } from "@/lib/format";
import { absoluteUrl } from "@/lib/seo";
import { JsonLd } from "@/components/JsonLd";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PropertyGallery } from "@/components/PropertyGallery";
import { isOwnerPublic, isPropertyExpired } from "@/lib/propertyVisibility";
import { toggleSavedProperty } from "@/app/buyer/actions";
import { EnquiryForm } from "./EnquiryForm";

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

  const details = [
    { label: "Type", value: PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType },
    { label: "Bedrooms", value: property.bedrooms ?? "—" },
    { label: "Bathrooms", value: property.bathrooms ?? "—" },
    { label: "Area", value: property.areaSqft ? `${property.areaSqft} sqft` : "—" },
    { label: "Status", value: property.status === "AVAILABLE" ? "Available" : property.status },
  ];

  const videoUrls = parseVideoUrls(property.youtubeUrl);
  const videoEmbeds = videoUrls.map(getVideoEmbed);

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

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Properties", href: "/properties" },
          { label: property.city, href: `/properties?city=${encodeURIComponent(property.city)}` },
          { label: property.title, href: `/properties/${property.slug}` },
        ]}
      />
      <JsonLd data={listingJsonLd} />

      <div className="mx-auto max-w-6xl px-4 pb-10 pt-4 sm:px-6">
        <PropertyGallery images={property.images} title={property.title} />

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {property.listingType === "SALE" ? "For Sale" : "For Rent"}
                </span>
                {property.condition && (
                  <span className="inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    {property.condition === "NEW_BOOKING" ? "New Booking" : "Resale"}
                  </span>
                )}
                {property.listingType === "SALE" && property.project?.reraNumber && (
                  <span className="inline-block rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                    RERA Registered
                  </span>
                )}
              </div>
              {isBuyer ? (
                <form action={toggleSavedProperty}>
                  <input type="hidden" name="propertyId" value={property.id} />
                  <input type="hidden" name="redirectTo" value={`/properties/${property.slug}`} />
                  <button
                    type="submit"
                    aria-label={isSaved ? "Remove from saved" : "Save property"}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border text-lg ${
                      isSaved
                        ? "border-red-200 bg-red-50 text-red-500"
                        : "border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-500"
                    }`}
                  >
                    ♥
                  </button>
                </form>
              ) : (
                <Link
                  href="/buyer/login"
                  aria-label="Log in to save"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-lg text-slate-400 hover:border-red-200 hover:text-red-500"
                >
                  ♡
                </Link>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">{property.title}</h1>
            <p className="mt-1 text-slate-500">
              {[property.locality, property.city].filter(Boolean).join(", ")}
            </p>
            {property.project && (
              <p className="mt-1 text-sm text-slate-500">
                Part of{" "}
                <Link href={`/projects/${property.project.slug}`} className="text-blue-600 hover:underline">
                  {property.project.name}
                </Link>
              </p>
            )}
            <p className="mt-4 text-3xl font-bold text-slate-900">
              {formatPrice(property.price, property.listingType)}
              {property.priceNegotiable && (
                <span className="ml-2 text-sm font-normal text-slate-500">Negotiable</span>
              )}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 p-5 sm:grid-cols-5">
              {details.map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-slate-400">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-800">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-semibold text-slate-900">Description</h2>
              <p className="mt-2 whitespace-pre-line text-slate-600">{property.description}</p>
            </div>

            {property.brochureUrl && (
              <div className="mt-6">
                <a
                  href={property.brochureUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
                  </svg>
                  Download Brochure (PDF)
                </a>
              </div>
            )}

            {videoEmbeds.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Video Tours & Virtual Walkthroughs
                  </h2>
                  <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                    {videoEmbeds.length} {videoEmbeds.length === 1 ? "Video" : "Videos"}
                  </span>
                </div>
                <div
                  className={`mt-3 grid gap-4 ${
                    videoEmbeds.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
                  }`}
                >
                  {videoEmbeds.map((video, idx) => (
                    <div
                      key={idx}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-sm"
                    >
                      {video.embedUrl ? (
                        <div className="relative aspect-video w-full">
                          <iframe
                            src={video.embedUrl}
                            title={`${property.title} video tour ${idx + 1}`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute inset-0 h-full w-full"
                          />
                        </div>
                      ) : (
                        <div className="flex aspect-video w-full flex-col items-center justify-center bg-slate-900 p-4 text-center text-white">
                          <svg className="h-10 w-10 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                          </svg>
                          <p className="mt-2 text-sm font-medium">Video Tour #{idx + 1}</p>
                          <a
                            href={video.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                          >
                            Watch Video
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {property.amenities && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-slate-900">Amenities</h2>
                <p className="mt-2 whitespace-pre-line text-slate-600">{property.amenities}</p>
              </div>
            )}

            {property.address && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-slate-900">Address</h2>
                <p className="mt-2 text-slate-600">{property.address}</p>
              </div>
            )}
          </div>

          <div>
            <div className="rounded-2xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900">Contact</h2>
              {property.owner.slug && (property.owner.role === "DEALER" || property.owner.role === "OWNER") ? (
                <Link
                  href={`/${property.owner.role === "DEALER" ? "dealers" : "owners"}/${property.owner.slug}`}
                  className="mt-2 block text-sm font-medium text-blue-600 hover:underline"
                >
                  {property.contactName ?? property.owner.company ?? property.owner.name}
                </Link>
              ) : (
                <p className="mt-2 text-sm text-slate-600">
                  {property.contactName ?? property.owner.name}
                </p>
              )}
              {(property.contactPhone ?? property.owner.phone) && (
                <p className="text-sm text-slate-600">
                  {property.contactPhone ?? property.owner.phone}
                </p>
              )}
              {(property.contactEmail ?? property.owner.email) && (
                <p className="text-sm text-slate-600">
                  {property.contactEmail ?? property.owner.email}
                </p>
              )}

              <h3 className="mt-5 text-sm font-semibold text-slate-900">Send an enquiry</h3>

              <EnquiryForm
                propertyId={property.id}
                slug={property.slug}
                defaultName={buyer?.name && buyer.name !== "Buyer" ? buyer.name : undefined}
                defaultPhone={buyer?.phone ?? undefined}
                defaultEmail={buyer?.email ?? undefined}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
