import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PUBLIC_LISTER_FILTER } from "@/lib/propertyVisibility";
import { MIN_LISTINGS_TO_INDEX } from "@/lib/location-seo";
import { toggleCityPublished, toggleLocalityPublished } from "../actions";

export default async function AdminSitemapPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const [countries, routeCounts] = await Promise.all([
    prisma.country.findMany({
      include: {
        states: {
          include: { cities: { include: { localities: true }, orderBy: { name: "asc" } } },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    Promise.all([
      prisma.property.count({ where: { approvalStatus: "APPROVED", owner: PUBLIC_LISTER_FILTER } }),
      prisma.user.count({ where: { role: "DEALER", slug: { not: null }, verified: true } }),
      prisma.user.count({ where: { role: "OWNER", slug: { not: null }, verified: true } }),
      prisma.developer.count(),
      prisma.project.count(),
    ]),
  ]);

  const [propertyRoutes, dealerRoutes, ownerRoutes, developerRoutes, projectRoutes] = routeCounts;

  // Property counts per city/locality name, matching what actually gets indexed (sitemap.ts logic).
  const cityCounts = new Map<string, number>();
  const localityCounts = new Map<string, number>();
  let totalLocationRoutes = 0;

  for (const country of countries) {
    for (const state of country.states) {
      for (const city of state.cities) {
        const count = await prisma.property.count({
          where: {
            approvalStatus: "APPROVED",
            status: "AVAILABLE",
            city: { contains: city.name },
            owner: PUBLIC_LISTER_FILTER,
          },
        });
        cityCounts.set(city.id, count);
        if (city.published && count >= MIN_LISTINGS_TO_INDEX) totalLocationRoutes += 1;

        for (const locality of city.localities) {
          const localityCount = await prisma.property.count({
            where: {
              approvalStatus: "APPROVED",
              status: "AVAILABLE",
              city: { contains: city.name },
              locality: { contains: locality.name },
              owner: PUBLIC_LISTER_FILTER,
            },
          });
          localityCounts.set(locality.id, localityCount);
          if (locality.published && localityCount >= MIN_LISTINGS_TO_INDEX) totalLocationRoutes += 1;
        }
      }
    }
  }

  const totalRoutes =
    4 + propertyRoutes + dealerRoutes + ownerRoutes + developerRoutes + projectRoutes + totalLocationRoutes;

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sitemap</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">sitemap.xml</code> regenerates
            automatically on every request — new cities, localities, dealers, and listings appear
            without any manual step. Use the toggles below to control which location pages get
            indexed.
          </p>
        </div>
        <a
          href="/sitemap.xml"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          View live sitemap.xml ↗
        </a>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total URLs", value: totalRoutes },
          { label: "Properties", value: propertyRoutes },
          { label: "Location pages indexed", value: totalLocationRoutes },
          { label: "Dealers", value: dealerRoutes },
          { label: "Owners", value: ownerRoutes },
          { label: "Developers / Projects", value: developerRoutes + projectRoutes },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-xs text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Location pages</h2>
        <p className="mt-1 text-sm text-slate-500">
          A city or locality is indexed only once it&apos;s published <em>and</em> has at least{" "}
          {MIN_LISTINGS_TO_INDEX} live listing{MIN_LISTINGS_TO_INDEX === 1 ? "" : "s"} — this avoids
          thin/duplicate pages hurting SEO.
        </p>

        {countries.every((c) => c.states.every((s) => s.cities.length === 0)) ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            No locations yet — add some from{" "}
            <Link href="/admin/locations" className="text-blue-600 hover:underline">
              Locations
            </Link>
            .
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {countries.map((country) =>
              country.states.map((state) =>
                state.cities.length === 0 ? null : (
                  <div key={state.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      {country.name} / {state.name}
                    </p>
                    <div className="mt-3 space-y-3">
                      {state.cities.map((city) => {
                        const count = cityCounts.get(city.id) ?? 0;
                        const indexed = city.published && count >= MIN_LISTINGS_TO_INDEX;
                        return (
                          <div key={city.id} className="border-l-2 border-slate-100 pl-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/properties-in/${city.slug}`}
                                  className="text-sm font-medium text-slate-800 hover:underline"
                                >
                                  {city.name}
                                </Link>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                    indexed
                                      ? "bg-green-50 text-green-700"
                                      : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  {indexed ? "Indexed" : "Not indexed"}
                                </span>
                                <span className="text-xs text-slate-400">{count} listing(s)</span>
                              </div>
                              <form action={toggleCityPublished}>
                                <input type="hidden" name="id" value={city.id} />
                                <button
                                  type="submit"
                                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                                >
                                  {city.published ? "Unpublish" : "Publish"}
                                </button>
                              </form>
                            </div>

                            {city.localities.length > 0 && (
                              <div className="mt-2 space-y-1.5 border-l-2 border-slate-50 pl-4">
                                {city.localities.map((locality) => {
                                  const localityCount = localityCounts.get(locality.id) ?? 0;
                                  const localityIndexed =
                                    locality.published && localityCount >= MIN_LISTINGS_TO_INDEX;
                                  return (
                                    <div
                                      key={locality.id}
                                      className="flex flex-wrap items-center justify-between gap-2"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Link
                                          href={`/properties-in/${city.slug}/${locality.slug}`}
                                          className="text-xs font-medium text-slate-600 hover:underline"
                                        >
                                          {locality.name}
                                        </Link>
                                        <span
                                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                            localityIndexed
                                              ? "bg-green-50 text-green-700"
                                              : "bg-slate-100 text-slate-500"
                                          }`}
                                        >
                                          {localityIndexed ? "Indexed" : "Not indexed"}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                          {localityCount} listing(s)
                                        </span>
                                      </div>
                                      <form action={toggleLocalityPublished}>
                                        <input type="hidden" name="id" value={locality.id} />
                                        <button
                                          type="submit"
                                          className="rounded-lg border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50"
                                        >
                                          {locality.published ? "Unpublish" : "Publish"}
                                        </button>
                                      </form>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
