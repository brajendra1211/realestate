import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GeoPageForm } from "@/components/admin/GeoPageForm";
import { updateLocality, deleteLocality, refetchLocalityCoordinates } from "../../../../actions";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ saved?: string }>;

export default async function EditLocalityPage({
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

  const locality = await prisma.locality.findUnique({
    where: { id },
    include: { city: { include: { state: { include: { country: true } } } } },
  });
  if (!locality) notFound();

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            {locality.city.state.country.name} / {locality.city.state.name} / {locality.city.name}
          </p>
          <h1 className="text-2xl font-bold text-slate-900">{locality.name}</h1>
        </div>
        <form action={deleteLocality}>
          <input type="hidden" name="id" value={locality.id} />
          <input type="hidden" name="cityId" value={locality.cityId} />
          <button
            type="submit"
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete locality
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
          action={updateLocality}
          refetchAction={refetchLocalityCoordinates}
          submitLabel="Save changes"
          hiddenFields={{ cityId: locality.cityId }}
          defaultValues={{
            id: locality.id,
            name: locality.name,
            latitude: locality.latitude,
            longitude: locality.longitude,
            heroImage: locality.heroImage,
            metaTitle: locality.metaTitle,
            metaDescription: locality.metaDescription,
            description: locality.description,
            published: locality.published,
          }}
        />
      </div>
    </div>
  );
}
