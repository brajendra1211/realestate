import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/seo";
import { notExpiredFilter } from "@/lib/propertyVisibility";

export function generateMetadata(): Metadata {
  const title = "Property Dealers & Brokers";
  const description =
    "Browse verified property dealers and brokers listing apartments, villas, and plots for sale and rent.";
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl("/dealers") },
  };
}

export default async function DealersPage() {
  const dealers = await prisma.user.findMany({
    where: { role: "DEALER", slug: { not: null }, verified: true },
    include: {
      _count: { select: { properties: { where: { approvalStatus: "APPROVED", ...notExpiredFilter() } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Property Dealers &amp; Brokers</h1>
      <p className="mt-1 text-sm text-slate-500">
        Verified dealers and brokers with active listings.
      </p>

      {dealers.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          No dealers listed yet.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {dealers.map((dealer) => {
            const displayName = dealer.company ?? dealer.name;
            return (
              <Link
                key={dealer.id}
                href={`/dealers/${dealer.slug}`}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-center gap-3">
                  {dealer.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={dealer.logoUrl}
                      alt={displayName}
                      className="h-14 w-14 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg font-bold text-blue-700">
                      {displayName.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate font-semibold text-slate-900">{displayName}</h2>
                      {dealer.verified && (
                        <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm text-slate-500">{dealer.name}</p>
                  </div>
                </div>

                {dealer.address && (
                  <p className="truncate text-xs text-slate-500">{dealer.address}</p>
                )}

                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
                  <span className="font-medium text-slate-700">
                    {dealer._count.properties} active listing{dealer._count.properties === 1 ? "" : "s"}
                  </span>
                  {dealer.phone && <span className="text-slate-500">{dealer.phone}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
