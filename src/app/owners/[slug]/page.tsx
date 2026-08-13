import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PropertyCard } from "@/components/PropertyCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { absoluteUrl } from "@/lib/seo";
import { notExpiredFilter } from "@/lib/propertyVisibility";

type Params = Promise<{ slug: string }>;

async function getOwner(slug: string) {
  return prisma.user.findFirst({
    where: { slug, role: "OWNER", verified: true },
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
  const owner = await getOwner(slug);
  if (!owner) return {};

  const place = owner.properties[0]?.city;
  const title = `${owner.name}${place ? ` — Property Owner in ${place}` : " — Property Owner"}`;
  const description =
    owner.about ??
    `${owner.name} lists verified properties for sale and rent${place ? ` in ${place}` : ""}. Browse listings and contact directly.`;

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/owners/${slug}`) },
    openGraph: { title, description, images: owner.logoUrl ? [{ url: owner.logoUrl }] : undefined },
  };
}

export default async function OwnerProfilePage({ params }: { params: Params }) {
  const { slug } = await params;
  const owner = await getOwner(slug);
  if (!owner) notFound();

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: owner.name,
    description: owner.about ?? undefined,
    image: owner.logoUrl ?? undefined,
    telephone: owner.phone ?? undefined,
    email: owner.email,
    url: absoluteUrl(`/owners/${owner.slug}`),
  };

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Owners", href: "/owners" },
          { label: owner.name, href: `/owners/${owner.slug}` },
        ]}
      />
      <JsonLd data={personJsonLd} />

      <div className="mx-auto max-w-6xl px-4 pb-10 pt-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 p-6">
          {owner.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={owner.logoUrl}
              alt={owner.name}
              className="h-16 w-16 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-50 text-xl font-bold text-blue-700">
              {owner.name.charAt(0)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{owner.name}</h1>
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                Verified
              </span>
            </div>
            <p className="mt-1 flex flex-wrap gap-3 text-sm text-slate-600">
              {owner.phone && <span>{owner.phone}</span>}
              {owner.email && <span>{owner.email}</span>}
            </p>
          </div>
        </div>

        {owner.about && <p className="mt-6 max-w-3xl text-slate-600">{owner.about}</p>}

        {(owner.address || owner.website || owner.instagramUrl || owner.facebookUrl) && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            {owner.address && <span className="text-slate-500">{owner.address}</span>}
            {owner.website && (
              <a href={owner.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Website
              </a>
            )}
            {owner.instagramUrl && (
              <a href={owner.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Instagram
              </a>
            )}
            {owner.facebookUrl && (
              <a href={owner.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Facebook
              </a>
            )}
          </div>
        )}

        <h2 className="mt-10 text-lg font-semibold text-slate-900">
          Listings by {owner.name} ({owner.properties.length})
        </h2>

        {owner.properties.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            No active listings right now.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {owner.properties.map((property) => (
              <PropertyCard key={property.slug} property={property} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
