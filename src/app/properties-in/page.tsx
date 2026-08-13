import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/seo";
import { NearMeButton } from "@/components/NearMeButton";

export function generateMetadata(): Metadata {
  const title = "Property by Location";
  const description = "Browse properties for sale and rent by city and locality across India.";
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl("/properties-in") },
  };
}

export default async function LocationsIndexPage() {
  const countries = await prisma.country.findMany({
    include: {
      states: {
        include: {
          cities: {
            where: { published: true },
            include: { _count: { select: { localities: true } } },
            orderBy: { name: "asc" },
          },
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Property by Location</h1>
        <NearMeButton className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700" />
      </div>

      {countries.every((country) => country.states.every((state) => state.cities.length === 0)) ? (
        <p className="mt-8 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          No location pages yet.
        </p>
      ) : (
        <div className="mt-8 space-y-8">
          {countries.map((country) => (
            <div key={country.id}>
              {country.states.some((state) => state.cities.length > 0) && (
                <h2 className="text-lg font-semibold text-slate-900">{country.name}</h2>
              )}
              <div className="mt-3 space-y-5">
                {country.states
                  .filter((state) => state.cities.length > 0)
                  .map((state) => (
                    <div key={state.id}>
                      <p className="text-sm font-medium text-slate-500">{state.name}</p>
                      <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {state.cities.map((city) => (
                          <li key={city.id}>
                            <Link
                              href={`/properties-in/${city.slug}`}
                              className="block rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                              {city.name}
                              {city._count.localities > 0 && (
                                <span className="block text-xs font-normal text-slate-400">
                                  {city._count.localities} localities
                                </span>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
