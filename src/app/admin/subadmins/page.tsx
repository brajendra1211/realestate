import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createSubAdmin, deleteSubAdmin } from "../actions";

type SearchParams = Promise<{ saved?: string; error?: string }>;

export default async function AdminSubAdminsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { saved, error } = await searchParams;

  const subAdmins = await prisma.user.findMany({
    where: { role: "SUBADMIN" },
    include: { _count: { select: { properties: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sub-admins</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Sub-admins can list properties for themselves or on behalf of any dealer or owner
          account. Their listings are published immediately, without review.
        </p>
      </div>

      {saved === "1" && (
        <p className="mt-4 max-w-2xl rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Sub-admin created.
        </p>
      )}
      {error === "validation" && (
        <p className="mt-4 max-w-2xl rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Please enter a name, valid email, and a password of at least 8 characters.
        </p>
      )}
      {error === "duplicate" && (
        <p className="mt-4 max-w-2xl rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          An account with that email already exists.
        </p>
      )}
      {error === "hasListings" && (
        <p className="mt-4 max-w-2xl rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          This sub-admin still owns listings — reassign or delete those first.
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form
          action={createSubAdmin}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-1"
        >
          <h2 className="font-semibold text-slate-900">Add sub-admin</h2>
          <div>
            <label className="text-sm font-medium text-slate-700">Name</label>
            <input
              type="text"
              name="name"
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              name="email"
              required
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-400">At least 8 characters.</p>
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Create sub-admin
          </button>
        </form>

        <div className="space-y-3 lg:col-span-2">
          {subAdmins.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
              No sub-admins yet.
            </p>
          ) : (
            subAdmins.map((subAdmin) => (
              <div
                key={subAdmin.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-900">{subAdmin.name}</p>
                  <p className="text-sm text-slate-500">{subAdmin.email}</p>
                  <p className="text-xs text-slate-400">
                    {subAdmin._count.properties} listing(s) under their own account
                  </p>
                </div>
                <form action={deleteSubAdmin}>
                  <input type="hidden" name="id" value={subAdmin.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </form>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
