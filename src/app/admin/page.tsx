import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { approveProperty, rejectProperty, verifyUser } from "./actions";

export default async function AdminPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const [pendingProperties, pendingUsers, stats, recentEnquiries] = await Promise.all([
    prisma.property.findMany({
      where: { approvalStatus: "PENDING" },
      include: { owner: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      where: { role: { in: ["OWNER", "DEALER"] }, verified: false },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
    Promise.all([
      prisma.property.count(),
      prisma.property.count({ where: { approvalStatus: "PENDING" } }),
      prisma.user.count({ where: { role: { in: ["OWNER", "DEALER"] } } }),
      prisma.user.count({ where: { role: { in: ["OWNER", "DEALER"] }, verified: false } }),
      prisma.enquiry.count(),
      prisma.developer.count(),
    ]),
    prisma.enquiry.findMany({
      include: { property: { select: { title: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const [totalProperties, pendingCount, totalListers, pendingUserCount, totalEnquiries, totalDevelopers] =
    stats;

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          A snapshot of listings, people, and activity on BayaEstate.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total properties", value: totalProperties },
          { label: "Pending approval", value: pendingCount },
          { label: "Owners / dealers", value: totalListers },
          { label: "Pending verification", value: pendingUserCount },
          { label: "Developers", value: totalDevelopers },
          { label: "Total enquiries", value: totalEnquiries },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-xs text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Pending listings</h2>
        <Link href="/admin/properties" className="text-sm font-medium text-blue-600 hover:underline">
          View all properties
        </Link>
      </div>

      {pendingProperties.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Nothing pending review.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {pendingProperties.map((property) => (
            <div
              key={property.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-slate-900">{property.title}</p>
                <p className="text-sm text-slate-500">
                  {[property.locality, property.city].filter(Boolean).join(", ")} ·{" "}
                  {formatPrice(property.price, property.listingType)}
                </p>
                <p className="text-xs text-slate-400">
                  by {property.owner.name} ({property.owner.email})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard/properties/${property.id}/edit`}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Review
                </Link>
                <form action={approveProperty}>
                  <input type="hidden" name="id" value={property.id} />
                  <button
                    type="submit"
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Approve
                  </button>
                </form>
                <form action={rejectProperty}>
                  <input type="hidden" name="id" value={property.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Reject
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Pending profile verification</h2>
        <Link href="/admin/users" className="text-sm font-medium text-blue-600 hover:underline">
          View all
        </Link>
      </div>

      {pendingUsers.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          Nothing pending verification.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {pendingUsers.map((user) => (
            <div
              key={user.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-slate-900">
                  {user.company ?? user.name}{" "}
                  <span className="text-xs font-medium text-slate-400">({user.role})</span>
                </p>
                <p className="text-sm text-slate-500">{user.email}</p>
              </div>
              <form action={verifyUser}>
                <input type="hidden" name="id" value={user.id} />
                <button
                  type="submit"
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                >
                  Verify &amp; activate
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recent enquiries</h2>
          <Link href="/admin/enquiries" className="text-sm font-medium text-blue-600 hover:underline">
            View all
          </Link>
        </div>
        {recentEnquiries.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No enquiries yet.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {recentEnquiries.map((enquiry) => (
              <div key={enquiry.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <p className="font-medium text-slate-800">
                  {enquiry.name} · {enquiry.phone}
                </p>
                <p className="text-slate-500">
                  {enquiry.property?.title ?? "General enquiry"}
                  {enquiry.message ? ` — ${enquiry.message}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
