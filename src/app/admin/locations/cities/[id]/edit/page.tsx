import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GeoPageForm } from "@/components/admin/GeoPageForm";
import {
  updateCity,
  deleteCity,
  refetchCityCoordinates,
  createLocality,
  deleteLocality,
} from "../../../../actions";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ saved?: string }>;

export default async function EditCityPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { id } = await params;
  const { saved } = await searchParams;

  const city = await prisma.city.findUnique({
    where: { id },
    include: {
      state: { include: { country: true } },
      localities: { orderBy: { name: "asc" } },
      _count: { select: { localities: true } },
    },
  });
  if (!city) notFound();

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {city.state.country.name} / {city.state.name}
          </p>
          <h1 className="text-2xl font-bold text-slate-900">{city.name}</h1>
        </div>
        <form action={deleteCity}>
          <input type="hidden" name="id" value={city.id} />
          <button
            type="submit"
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete city
          </button>
        </form>
      </div>

      {saved === "1" && (
        <p className="mt-4 max-w-3xl rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Saved.
        </p>
      )}

      <div className="mt-6 max-w-3xl rounded-2xl border border-slate-200 bg-white p-6">
        <GeoPageForm
          action={updateCity}
          refetchAction={refetchCityCoordinates}
          submitLabel="Save changes"
          defaultValues={{
            id: city.id,
            name: city.name,
            latitude: city.latitude,
            longitude: city.longitude,
            heroImage: city.heroImage,
            metaTitle: city.metaTitle,
            metaDescription: city.metaDescription,
            description: city.description,
            published: city.published,
          }}
        />
      </div>

      <div className="mt-10 max-w-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Localities in {city.name} ({city._count.localities})
          </h2>
        </div>

        <form action={createLocality} className="mt-3 flex gap-2">
          <input type="hidden" name="cityId" value={city.id} />
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
            Add locality
          </button>
        </form>

        {city.localities.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            No localities yet.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {city.localities.map((locality) => (
              <div
                key={locality.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
              >
                <span className="text-sm text-slate-700">
                  {locality.name}
                  {!locality.published && (
                    <span className="ml-2 text-xs text-slate-400">unpublished</span>
                  )}
                </span>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/properties-in/${city.slug}/${locality.slug}`}
                    className="text-xs font-medium text-slate-500 hover:underline"
                  >
                    View
                  </Link>
                  <Link
                    href={`/admin/locations/localities/${locality.id}/edit`}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Manage
                  </Link>
                  <form action={deleteLocality}>
                    <input type="hidden" name="id" value={locality.id} />
                    <input type="hidden" name="cityId" value={city.id} />
                    <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
