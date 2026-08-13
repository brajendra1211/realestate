import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAmenity, updateAmenity, deleteAmenity } from "../actions";

type SearchParams = Promise<{ saved?: string; error?: string }>;

export default async function AdminAmenitiesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { saved, error } = await searchParams;

  const amenities = await prisma.amenity.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Amenities</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Manage the amenity list shown as checkboxes on property and project listing forms.
        </p>
      </div>

      {saved === "1" && (
        <p className="mt-4 max-w-2xl rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Saved.
        </p>
      )}
      {error === "name" && (
        <p className="mt-4 max-w-2xl rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Enter a name for the amenity.
        </p>
      )}

      <div className="mt-6 max-w-md rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Add amenity</h2>
        <form action={createAmenity} className="mt-3 flex gap-2">
          <input
            type="text"
            name="name"
            required
            placeholder="e.g. Rooftop Lounge"
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

      <div className="mt-8 max-w-2xl">
        <h2 className="text-lg font-semibold text-slate-900">All amenities ({amenities.length})</h2>

        {amenities.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            No amenities yet — add one above.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {amenities.map((amenity) => (
              <li
                key={amenity.id}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3"
              >
                <form action={updateAmenity} className="flex flex-1 items-center gap-2">
                  <input type="hidden" name="id" value={amenity.id} />
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={amenity.name}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Save
                  </button>
                </form>
                <form action={deleteAmenity}>
                  <input type="hidden" name="id" value={amenity.id} />
                  <button
                    type="submit"
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
