import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminDevelopersPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const developers = await prisma.developer.findMany({
    include: { _count: { select: { projects: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Developers</h1>
          <p className="mt-1 text-sm text-slate-500">{developers.length} developers</p>
        </div>
        <Link
          href="/admin/developers/new"
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Add developer
        </Link>
      </div>

      {developers.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No developers yet.
        </p>
      ) : (
        <div className="mt-8 space-y-3">
          {developers.map((developer) => (
            <div
              key={developer.id}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div>
                <p className="font-semibold text-slate-900">
                  {developer.name}
                  {developer.verified && (
                    <span className="ml-2 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                      Verified
                    </span>
                  )}
                </p>
                <p className="text-sm text-slate-500">
                  {developer.city ?? "—"} · {developer._count.projects} project(s)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/developers/${developer.slug}`}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  View
                </Link>
                <Link
                  href={`/admin/developers/${developer.id}/edit`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Manage
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
