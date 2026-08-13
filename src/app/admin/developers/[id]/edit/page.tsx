import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DeveloperForm } from "@/components/DeveloperForm";
import { updateDeveloper, deleteDeveloper } from "../../../actions";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ saved?: string }>;

export default async function EditDeveloperPage({
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

  const developer = await prisma.developer.findUnique({
    where: { id },
    include: { projects: { orderBy: { createdAt: "desc" } } },
  });
  if (!developer) notFound();

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Edit developer</h1>
        <form action={deleteDeveloper}>
          <input type="hidden" name="id" value={developer.id} />
          <button
            type="submit"
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete developer
          </button>
        </form>
      </div>

      {saved === "1" && (
        <p className="mt-4 max-w-3xl rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Saved.</p>
      )}

      <div className="mt-6 max-w-3xl rounded-2xl border border-slate-200 bg-white p-6">
        <DeveloperForm action={updateDeveloper} submitLabel="Save changes" defaultValues={developer} />
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Projects</h2>
          <Link
            href={`/admin/developers/${developer.id}/projects/new`}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Add project
          </Link>
        </div>

        {developer.projects.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            No projects yet.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {developer.projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div>
                  <p className="font-semibold text-slate-900">{project.name}</p>
                  <p className="text-sm text-slate-500">
                    {[project.locality, project.city].filter(Boolean).join(", ")} · {project.status}
                  </p>
                </div>
                <Link
                  href={`/admin/developers/${developer.id}/projects/${project.id}/edit`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Manage
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
