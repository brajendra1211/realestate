import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GeoCascadeFields } from "@/components/admin/GeoCascadeFields";
import {
  createCountry,
  deleteCountry,
  createState,
  deleteState,
  createCity,
  createLocality,
} from "../actions";

type SearchParams = Promise<{ saved?: string; error?: string }>;

const ERROR_MESSAGES: Record<string, string> = {
  state: "Pick a country and enter a name before adding a state.",
  city: "Pick a country and state before adding a city.",
  locality: "Pick a country, state, and city before adding a locality.",
};

export default async function AdminLocationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { saved, error } = await searchParams;

  const countries = await prisma.country.findMany({
    include: {
      states: {
        include: {
          cities: {
            include: { _count: { select: { localities: true } } },
            orderBy: { name: "asc" },
          },
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const countryOptions = countries.map((country) => ({ id: country.id, name: country.name }));

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Locations</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Build the Country → State → City → Locality hierarchy that drives{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">/properties-in</code> SEO
          pages. City and Locality pages auto-target &quot;property in&quot;, &quot;flat in&quot;,
          and &quot;near me&quot; searches, and stay noindexed until they have live listings so
          the site doesn&apos;t get penalized for thin content.
        </p>
      </div>

      {saved === "1" && (
        <p className="mt-4 max-w-2xl rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Saved.
        </p>
      )}
      {error && ERROR_MESSAGES[error] && (
        <p className="mt-4 max-w-2xl rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_MESSAGES[error]}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Add country</h2>
          <form action={createCountry} className="mt-3 flex gap-2">
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. India"
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Add
            </button>
          </form>
        </div>

        {countryOptions.length > 0 && (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold text-slate-900">Add state</h2>
              <form action={createState} className="mt-3 space-y-3">
                <GeoCascadeFields countries={countryOptions} mode="state" />
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Karnataka"
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold text-slate-900">Add city</h2>
              <p className="mt-1 text-xs text-slate-400">
                Add SEO details (meta title, description, coordinates) after creating from the
                city&apos;s manage page.
              </p>
              <form action={createCity} className="mt-3 space-y-3">
                <GeoCascadeFields countries={countryOptions} mode="city" />
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Bengaluru"
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold text-slate-900">Add locality</h2>
              <p className="mt-1 text-xs text-slate-400">
                This is the &quot;property in [locality]&quot; landing page — the most targeted
                one.
              </p>
              <form action={createLocality} className="mt-3 space-y-3">
                <GeoCascadeFields countries={countryOptions} mode="locality" />
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Whitefield"
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">Hierarchy</h2>

        {countries.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Add a country to get started.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {countries.map((country) => (
              <div key={country.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900">{country.name}</p>
                  <form action={deleteCountry}>
                    <input type="hidden" name="id" value={country.id} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </form>
                </div>

                {country.states.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-400">No states yet.</p>
                ) : (
                  <div className="mt-3 space-y-3 border-l-2 border-slate-100 pl-4">
                    {country.states.map((state) => (
                      <div key={state.id}>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-800">{state.name}</p>
                          <form action={deleteState}>
                            <input type="hidden" name="id" value={state.id} />
                            <button
                              type="submit"
                              className="text-xs font-medium text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          </form>
                        </div>

                        {state.cities.length === 0 ? (
                          <p className="mt-1 text-xs text-slate-400">No cities yet.</p>
                        ) : (
                          <ul className="mt-1 space-y-1 border-l-2 border-slate-100 pl-4">
                            {state.cities.map((city) => (
                              <li
                                key={city.id}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-slate-600">
                                  {city.name}{" "}
                                  <span className="text-xs text-slate-400">
                                    ({city._count.localities} localities)
                                    {!city.published && " · unpublished"}
                                  </span>
                                </span>
                                <div className="flex items-center gap-3">
                                  <Link
                                    href={`/properties-in/${city.slug}`}
                                    className="text-xs font-medium text-slate-500 hover:underline"
                                  >
                                    View
                                  </Link>
                                  <Link
                                    href={`/admin/locations/cities/${city.id}/edit`}
                                    className="text-xs font-medium text-blue-600 hover:underline"
                                  >
                                    Manage
                                  </Link>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
