import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/seo";

export function generateMetadata(): Metadata {
  const title = "Real Estate Developers & Builders";
  const description =
    "Explore residential and commercial projects from leading real estate developers and builders.";
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl("/developers") },
  };
}

export default async function DevelopersPage() {
  const developers = await prisma.developer.findMany({
    include: { _count: { select: { projects: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Real Estate Developers</h1>
      <p className="mt-1 text-sm text-slate-500">
        Browse projects from leading developers and builders.
      </p>

      {developers.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          No developers listed yet.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {developers.map((developer) => (
            <Link
              key={developer.id}
              href={`/developers/${developer.slug}`}
              className="rounded-2xl border border-slate-200 p-5 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-slate-900">{developer.name}</h2>
                {developer.verified && (
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                    Verified
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">{developer.city ?? "—"}</p>
              <p className="mt-2 text-sm text-slate-500">{developer._count.projects} project(s)</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
