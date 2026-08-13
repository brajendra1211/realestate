import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProjectForm } from "@/components/ProjectForm";
import { updateProject, deleteProject } from "../../../../../actions";

type Params = Promise<{ id: string; projectId: string }>;
type SearchParams = Promise<{ saved?: string }>;

export default async function EditProjectPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { id, projectId } = await params;
  const { saved } = await searchParams;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { images: { orderBy: { order: "asc" } }, developer: true },
  });
  if (!project || project.developerId !== id) notFound();

  const amenityOptions = await prisma.amenity.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          Edit project — {project.developer.name}
        </h1>
        <form action={deleteProject}>
          <input type="hidden" name="id" value={project.id} />
          <input type="hidden" name="developerId" value={id} />
          <button
            type="submit"
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete project
          </button>
        </form>
      </div>

      {saved === "1" && (
        <p className="mt-4 max-w-3xl rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Saved.</p>
      )}

      <div className="mt-6 max-w-3xl rounded-2xl border border-slate-200 bg-white p-6">
        <ProjectForm
          action={updateProject}
          developerId={id}
          submitLabel="Save changes"
          amenityOptions={amenityOptions}
          defaultValues={{
            id: project.id,
            name: project.name,
            description: project.description,
            status: project.status,
            city: project.city,
            locality: project.locality,
            address: project.address,
            priceMin: project.priceMin,
            priceMax: project.priceMax,
            possessionDate: project.possessionDate
              ? project.possessionDate.toISOString().slice(0, 10)
              : null,
            amenities: project.amenities,
            reraNumber: project.reraNumber,
            metaTitle: project.metaTitle,
            metaDescription: project.metaDescription,
            images: project.images.map((image) => ({ url: image.url })),
          }}
        />
      </div>
    </div>
  );
}
