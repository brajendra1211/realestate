import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { absoluteUrl } from "@/lib/seo";

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

async function getDeveloper(slug: string) {
  return prisma.developer.findUnique({
    where: { slug },
    include: {
      projects: {
        include: { images: { orderBy: { order: "asc" }, take: 1 } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const developer = await getDeveloper(slug);
  if (!developer) return {};

  const title = developer.metaTitle ?? `${developer.name} — Projects${developer.city ? ` in ${developer.city}` : ""}`;
  const description =
    developer.metaDescription ??
    developer.about ??
    `Explore residential and commercial projects by ${developer.name}.`;

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/developers/${slug}`) },
    openGraph: { title, description, images: developer.logoUrl ? [{ url: developer.logoUrl }] : undefined },
  };
}

export default async function DeveloperProfilePage({ params }: { params: Params }) {
  const { slug } = await params;
  const developer = await getDeveloper(slug);
  if (!developer) notFound();

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: developer.name,
    description: developer.about ?? undefined,
    logo: developer.logoUrl ?? undefined,
    url: developer.website ?? absoluteUrl(`/developers/${developer.slug}`),
    telephone: developer.contactPhone ?? undefined,
    email: developer.contactEmail ?? undefined,
  };

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Developers", href: "/developers" },
          { label: developer.name, href: `/developers/${developer.slug}` },
        ]}
      />
      <JsonLd data={orgJsonLd} />

      <div className="mx-auto max-w-6xl px-4 pb-10 pt-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 p-6">
          {developer.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={developer.logoUrl}
              alt={developer.name}
              className="h-16 w-16 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-50 text-xl font-bold text-blue-700">
              {developer.name.charAt(0)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{developer.name}</h1>
              {developer.verified && (
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                  Verified
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">{developer.city ?? ""}</p>
          </div>
        </div>

        {developer.about && <p className="mt-6 max-w-3xl text-slate-600">{developer.about}</p>}

        <h2 className="mt-10 text-lg font-semibold text-slate-900">
          Projects by {developer.name} ({developer.projects.length})
        </h2>

        {developer.projects.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            No projects listed yet.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {developer.projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.slug}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                  {project.images[0] ? (
                    <Image
                      src={project.images[0].url}
                      alt={project.name}
                      fill
                      className="object-cover transition duration-300 group-hover:scale-105"
                      sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                      No photo
                    </div>
                  )}
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                    {PROJECT_STATUS_LABELS[project.status]}
                  </span>
                </div>
                <div className="space-y-1 p-4">
                  <h3 className="font-medium text-slate-800">{project.name}</h3>
                  <p className="text-sm text-slate-500">
                    {[project.locality, project.city].filter(Boolean).join(", ")}
                  </p>
                  {(project.priceMin || project.priceMax) && (
                    <p className="text-sm font-semibold text-slate-800">
                      {project.priceMin ? inr.format(project.priceMin) : ""}
                      {project.priceMin && project.priceMax ? " – " : ""}
                      {project.priceMax ? inr.format(project.priceMax) : ""}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
