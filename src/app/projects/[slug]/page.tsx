import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PropertyCard } from "@/components/PropertyCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { absoluteUrl } from "@/lib/seo";
import { PUBLIC_LISTER_FILTER, notExpiredFilter } from "@/lib/propertyVisibility";

type Params = Promise<{ slug: string }>;

const PROJECT_STATUS_LABELS: Record<string, string> = {
  UPCOMING: "Upcoming",
  UNDER_CONSTRUCTION: "Under Construction",
  READY_TO_MOVE: "Ready to Move",
};

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

async function getProject(slug: string) {
  return prisma.project.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { order: "asc" } },
      developer: true,
      units: {
        where: { approvalStatus: "APPROVED", owner: PUBLIC_LISTER_FILTER, ...notExpiredFilter() },
        include: { images: { orderBy: { order: "asc" }, take: 1 } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return {};

  const place = [project.locality, project.city].filter(Boolean).join(", ");
  const title = project.metaTitle ?? `${project.name}, ${place} — by ${project.developer.name}`;
  const description =
    project.metaDescription ??
    `${project.name} in ${place} by ${project.developer.name}. ${project.description.slice(0, 140)}`;
  const image = project.images[0]?.url;

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/projects/${slug}`) },
    openGraph: { title, description, images: image ? [{ url: image }] : undefined },
  };
}

export default async function ProjectDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  const projectJsonLd = {
    "@context": "https://schema.org",
    "@type": "ApartmentComplex",
    name: project.name,
    description: project.description,
    url: absoluteUrl(`/projects/${project.slug}`),
    image: project.images.map((image) => image.url),
    address: {
      "@type": "PostalAddress",
      addressLocality: project.locality ?? project.city,
      addressRegion: project.city,
      addressCountry: "IN",
    },
    developer: {
      "@type": "Organization",
      name: project.developer.name,
      url: absoluteUrl(`/developers/${project.developer.slug}`),
    },
  };

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Developers", href: "/developers" },
          { label: project.developer.name, href: `/developers/${project.developer.slug}` },
          { label: project.name, href: `/projects/${project.slug}` },
        ]}
      />
      <JsonLd data={projectJsonLd} />

      <div className="mx-auto max-w-6xl px-4 pb-10 pt-4 sm:px-6">
        {project.images.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100 sm:col-span-2 sm:row-span-2">
              <Image
                src={project.images[0].url}
                alt={`${project.name} — photo 1`}
                fill
                className="object-cover"
                sizes="(min-width: 640px) 50vw, 100vw"
                priority
              />
            </div>
            {project.images.slice(1, 5).map((image, index) => (
              <div
                key={image.id}
                className="relative hidden aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100 sm:block"
              >
                <Image
                  src={image.url}
                  alt={`${project.name} — photo ${index + 2}`}
                  fill
                  className="object-cover"
                  sizes="25vw"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex aspect-[16/6] items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            No photos available
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {PROJECT_STATUS_LABELS[project.status]}
              </span>
              {project.reraNumber && (
                <span className="inline-block rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                  RERA Registered
                </span>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">{project.name}</h1>
            <p className="mt-1 text-slate-500">
              {[project.locality, project.city].filter(Boolean).join(", ")}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              by{" "}
              <Link href={`/developers/${project.developer.slug}`} className="text-blue-600 hover:underline">
                {project.developer.name}
              </Link>
            </p>

            {(project.priceMin || project.priceMax) && (
              <p className="mt-4 text-2xl font-bold text-slate-900">
                {project.priceMin ? inr.format(project.priceMin) : ""}
                {project.priceMin && project.priceMax ? " – " : ""}
                {project.priceMax ? inr.format(project.priceMax) : ""}
              </p>
            )}

            {project.possessionDate && (
              <p className="mt-2 text-sm text-slate-500">
                Possession: {project.possessionDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
              </p>
            )}

            <div className="mt-8">
              <h2 className="text-lg font-semibold text-slate-900">About this project</h2>
              <p className="mt-2 whitespace-pre-line text-slate-600">{project.description}</p>
            </div>

            {project.amenities && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-slate-900">Amenities</h2>
                <p className="mt-2 whitespace-pre-line text-slate-600">{project.amenities}</p>
              </div>
            )}

            {project.address && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-slate-900">Address</h2>
                <p className="mt-2 text-slate-600">{project.address}</p>
              </div>
            )}
          </div>

          <div>
            <div className="rounded-2xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900">Developer</h2>
              <p className="mt-2 text-sm font-medium text-slate-800">{project.developer.name}</p>
              {project.developer.contactPhone && (
                <p className="text-sm text-slate-600">{project.developer.contactPhone}</p>
              )}
              {project.developer.contactEmail && (
                <p className="text-sm text-slate-600">{project.developer.contactEmail}</p>
              )}
              <Link
                href={`/developers/${project.developer.slug}`}
                className="mt-3 block text-sm font-medium text-blue-600 hover:underline"
              >
                View all projects
              </Link>
              {project.reraNumber && (
                <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  RERA No. <span className="font-medium text-slate-700">{project.reraNumber}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {project.units.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-semibold text-slate-900">Available units</h2>
            <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {project.units.map((unit) => (
                <PropertyCard key={unit.slug} property={unit} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
