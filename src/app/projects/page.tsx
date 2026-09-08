import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/seo";
import { formatINR } from "@/lib/format";

export function generateMetadata(): Metadata {
  return {
    title: "New Real Estate Projects & Townships",
    description: "Explore upcoming, ready-to-move, and luxury real estate projects from top builders.",
    alternates: { canonical: absoluteUrl("/projects") },
  };
}

const PROJECT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  UPCOMING: { label: "Upcoming", color: "bg-blue-50 text-blue-700" },
  UNDER_CONSTRUCTION: { label: "Under Construction", color: "bg-amber-50 text-amber-700" },
  READY_TO_MOVE: { label: "Ready to Move", color: "bg-green-50 text-green-700" },
};

export default async function ProjectsDirectoryPage() {
  const projects = await prisma.project.findMany({
    include: {
      developer: { select: { name: true, slug: true } },
      images: { orderBy: { order: "asc" }, take: 1 },
      _count: { select: { units: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Featured Real Estate Projects</h1>
          <p className="mt-1 text-sm text-slate-500">
            Browse premium residential and commercial township projects from top developers.
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          <p>No projects listed yet.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const statusInfo = PROJECT_STATUS_LABELS[project.status] ?? {
              label: project.status,
              color: "bg-slate-100 text-slate-700",
            };
            const image = project.images[0]?.url;

            return (
              <Link
                key={project.id}
                href={`/projects/${project.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
              >
                <div className="relative h-48 w-full bg-slate-100">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt={project.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-slate-100 to-slate-200 text-slate-400">
                      <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-slate-300">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21V7l6-3 6 3v14M15 21V11l6-2v12M9 21v-4M3 21h18" />
                      </svg>
                    </div>
                  )}
                  <span
                    className={`absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-xs ${statusInfo.color} bg-white/95 backdrop-blur-xs`}
                  >
                    {statusInfo.label}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs font-medium uppercase tracking-wider text-blue-600">
                    By {project.developer.name}
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-slate-900 group-hover:text-blue-600">
                    {project.name}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {[project.locality, project.city].filter(Boolean).join(", ")}
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-400">Starting from</p>
                      <p className="font-bold text-slate-900">
                        {project.priceMin ? formatINR(project.priceMin) : "Price on Request"}
                      </p>
                    </div>
                    {project.reraNumber && (
                      <span className="rounded bg-slate-50 px-2 py-1 text-[11px] font-mono text-slate-500">
                        RERA Verified
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
