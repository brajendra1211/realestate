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
      prisma.agentListing.count({ where: { source: "CUSTOMER_GOLD", approvalStatus: "PENDING" } }),
      prisma.deal.count({ where: { status: { not: "CLOSED" } } }),
      prisma.directPropertyVisit.count({ where: { otpVerified: true } }),
      prisma.platformAntiBypassAgreement.count(),
    ]),
    prisma.enquiry.findMany({
      include: { property: { select: { title: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const [
    totalProperties,
    pendingCount,
    totalListers,
    pendingUserCount,
    pendingGoldCount,
    activeDealsCount,
    verifiedVisitsCount,
    antiBypassCount,
  ] = stats;

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
        <p className="mt-1 text-sm text-slate-500">
          A snapshot of listings, people, and activity on BayaEstate.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
        {[
          { label: "Total properties", value: totalProperties, href: "/admin/properties" },
          { label: "Pending approval", value: pendingCount, href: "/admin/properties" },
          { label: "Gold Moderation", value: pendingGoldCount, href: "/admin/gold-listings" },
          { label: "Active B2B Deals", value: activeDealsCount, href: "/admin/deals" },
          { label: "Verified Visits", value: verifiedVisitsCount, href: "/admin/analytics" },
          { label: "Anti-Bypass Deeds", value: antiBypassCount, href: "/admin/analytics" },
          { label: "Owners / dealers", value: totalListers, href: "/admin/users" },
          { label: "Pending verification", value: pendingUserCount, href: "/admin/users" },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-400 hover:shadow-xs"
          >
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-xs text-slate-500">{stat.label}</p>
          </Link>
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
