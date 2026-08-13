import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PropertyCard } from "@/components/PropertyCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { absoluteUrl } from "@/lib/seo";
import { notExpiredFilter } from "@/lib/propertyVisibility";

type Params = Promise<{ slug: string }>;

async function getDealer(slug: string) {
  return prisma.user.findFirst({
    where: { slug, role: "DEALER", verified: true },
    include: {
      properties: {
        where: { approvalStatus: "APPROVED", ...notExpiredFilter() },
        include: { images: { orderBy: { order: "asc" }, take: 1 } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const dealer = await getDealer(slug);
  if (!dealer) return {};

  const displayName = dealer.company ?? dealer.name;
  const place = dealer.properties[0]?.city;
  const title = `${displayName}${place ? ` — Property Dealer in ${place}` : " — Property Dealer"}`;
  const description =
    dealer.about ??
    `${displayName} lists verified properties for sale and rent${place ? ` in ${place}` : ""}. Browse listings and contact directly.`;

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/dealers/${slug}`) },
    openGraph: { title, description, images: dealer.logoUrl ? [{ url: dealer.logoUrl }] : undefined },
  };
}

export default async function DealerProfilePage({ params }: { params: Params }) {
  const { slug } = await params;
  const dealer = await getDealer(slug);
  if (!dealer) notFound();

  const displayName = dealer.company ?? dealer.name;

  const agentJsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: displayName,
    description: dealer.about ?? undefined,
    image: dealer.logoUrl ?? undefined,
    telephone: dealer.phone ?? undefined,
    email: dealer.email,
    url: absoluteUrl(`/dealers/${dealer.slug}`),
  };

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Dealers", href: "/dealers" },
          { label: displayName, href: `/dealers/${dealer.slug}` },
        ]}
      />
      <JsonLd data={agentJsonLd} />

      <div className="mx-auto max-w-6xl px-4 pb-10 pt-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 p-6">
          {dealer.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dealer.logoUrl}
              alt={displayName}
              className="h-16 w-16 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-50 text-xl font-bold text-blue-700">
              {displayName.charAt(0)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{displayName}</h1>
              {dealer.verified && (
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                  Verified
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">{dealer.name}</p>
            <p className="mt-1 flex flex-wrap gap-3 text-sm text-slate-600">
              {dealer.phone && <span>{dealer.phone}</span>}
              {dealer.email && <span>{dealer.email}</span>}
            </p>
            {dealer.licenseNumber && (
              <p className="mt-1 text-xs text-slate-400">License / RERA no. {dealer.licenseNumber}</p>
            )}
          </div>
        </div>

        {dealer.about && <p className="mt-6 max-w-3xl text-slate-600">{dealer.about}</p>}

        {(dealer.address || dealer.website || dealer.instagramUrl || dealer.facebookUrl) && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            {dealer.address && <span className="text-slate-500">{dealer.address}</span>}
            {dealer.website && (
              <a href={dealer.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Website
              </a>
            )}
            {dealer.instagramUrl && (
              <a href={dealer.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Instagram
              </a>
            )}
            {dealer.facebookUrl && (
              <a href={dealer.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Facebook
              </a>
            )}
          </div>
        )}

        <h2 className="mt-10 text-lg font-semibold text-slate-900">
          Listings by {displayName} ({dealer.properties.length})
        </h2>

        {dealer.properties.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            No active listings right now.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {dealer.properties.map((property) => (
              <PropertyCard key={property.slug} property={property} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
