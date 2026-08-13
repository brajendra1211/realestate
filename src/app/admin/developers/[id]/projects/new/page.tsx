import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProjectForm } from "@/components/ProjectForm";
import { createProject } from "../../../../actions";

type Params = Promise<{ id: string }>;

export default async function NewProjectPage({ params }: { params: Params }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { id } = await params;
  const developer = await prisma.developer.findUnique({ where: { id } });
  if (!developer) notFound();

  const amenityOptions = await prisma.amenity.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <h1 className="text-2xl font-bold text-slate-900">Add project — {developer.name}</h1>
      <div className="mt-6 max-w-3xl rounded-2xl border border-slate-200 bg-white p-6">
        <ProjectForm
          action={createProject}
          developerId={developer.id}
          submitLabel="Create project"
          amenityOptions={amenityOptions}
        />
      </div>
    </div>
  );
}
