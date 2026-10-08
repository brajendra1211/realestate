import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { approveProperty, rejectProperty, verifyUser } from "./actions";

export default async function AdminPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const [properties, pendingProperties, pendingUsers, stats, recentEnquiries] = await Promise.all([
    prisma.property.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { owner: { select: { name: true, email: true } }, images: { take: 1 } },
    }),
    prisma.property.findMany({
      where: { approvalStatus: "PENDING" },
      include: { owner: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      where: { role: { in: ["OWNER", "DEALER", "AGENT"] }, verified: false },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
    Promise.all([
      prisma.property.count(),
      prisma.property.count({ where: { approvalStatus: "PENDING" } }),
      prisma.user.count({ where: { role: { in: ["OWNER", "DEALER"] } } }),
      prisma.user.count({ where: { role: "AGENT" } }),
      prisma.agentListing.count({ where: { source: "CUSTOMER_GOLD", approvalStatus: "PENDING" } }).catch(() => 0),
      prisma.deal.count({ where: { status: { not: "CLOSED" } } }).catch(() => 0),
      prisma.directPropertyVisit.count({ where: { otpVerified: true } }).catch(() => 0),
      prisma.enquiry.count(),
    ]),
    prisma.enquiry.findMany({
      include: { property: { select: { title: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const [
    totalProperties,
    pendingCount,
    totalListers,
    totalAgents,
    pendingGoldCount,
    activeDealsCount,
    verifiedVisitsCount,
    totalEnquiriesCount,
  ] = stats;

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-8 lg:p-10 space-y-8">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-2">
            Noida Prime Console
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Administration Overview
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
            Real-time management of properties, channel partners, buyer leads, and platform activity.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition"
          >
            <span>Live Site</span>
            <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>
          <Link
            href="/dashboard/properties/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition"
          >
            <span>+ Add Property</span>
          </Link>
        </div>
      </div>

      {/* 2. Top Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Total Properties</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </span>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">{totalProperties}</div>
          <div className="mt-1 text-xs text-slate-500 font-medium">3 For Sale · 2 For Rent</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Pending Review</span>
            <span className={`p-1.5 rounded-lg ${pendingCount > 0 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">{pendingCount}</div>
          <div className="mt-1 text-xs text-slate-500 font-medium">
            {pendingCount === 0 ? "All caught up" : "Requires moderation"}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Channel Partners</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">{totalAgents}</div>
          <div className="mt-1 text-xs text-slate-500 font-medium">Prime Agent Network</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Customer Leads</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </span>
          </div>
          <div className="mt-3 text-3xl font-black text-slate-900">{totalEnquiriesCount}</div>
          <div className="mt-1 text-xs text-slate-500 font-medium">Direct Buyer Inquiries</div>
        </div>
      </div>

      {/* 3. Secondary Operational Quick Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link
          href="/admin/deals"
          className="rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-400 transition"
        >
          <div className="text-xl font-bold text-slate-900">{activeDealsCount}</div>
          <div className="text-xs font-medium text-slate-500">Active B2B Deals</div>
        </Link>
        <Link
          href="/admin/analytics"
          className="rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-400 transition"
        >
          <div className="text-xl font-bold text-slate-900">{verifiedVisitsCount}</div>
          <div className="text-xs font-medium text-slate-500">Verified Site Visits</div>
        </Link>
        <Link
          href="/admin/gold-listings"
          className="rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-400 transition"
        >
          <div className="text-xl font-bold text-slate-900">{pendingGoldCount}</div>
          <div className="text-xs font-medium text-slate-500">Gold Moderation</div>
        </Link>
        <Link
          href="/admin/users"
          className="rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-400 transition"
        >
          <div className="text-xl font-bold text-slate-900">{totalListers}</div>
          <div className="text-xs font-medium text-slate-500">Owners & Dealers</div>
        </Link>
      </div>

      {/* 4. Split Dashboard Grid (Recent Properties & Inquiries) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Properties Overview */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Live Inventory</h2>
              <p className="text-xs text-slate-500">Properties currently live and active on the platform</p>
            </div>
            <Link href="/admin/properties" className="text-xs font-semibold text-blue-600 hover:underline">
              View All Properties →
            </Link>
          </div>

          <div className="space-y-3">
            {properties.map((property) => (
              <div
                key={property.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:border-slate-300 transition gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      property.listingType === "SALE" ? "bg-slate-900 text-white" : "bg-blue-600 text-white"
                    }`}>
                      {property.listingType}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {property.locality ? `${property.locality}, ${property.city}` : property.city}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 truncate">{property.title}</h3>
                  <p className="text-xs font-bold text-blue-600 mt-0.5">
                    {formatPrice(property.price, property.listingType)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/properties/${property.slug}`}
                    target="_blank"
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    View
                  </Link>
                  <Link
                    href={`/dashboard/properties/${property.id}/edit`}
                    className="rounded-lg bg-slate-900 hover:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white transition"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Pending Queue & Inquiries */}
        <div className="lg:col-span-5 space-y-6">
          {/* Pending Queue */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Moderation Queue</h2>
                <p className="text-xs text-slate-500">Properties waiting for verification</p>
              </div>
            </div>

            {pendingProperties.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center bg-white text-xs text-slate-500">
                ✓ No properties currently pending moderation.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingProperties.map((property) => (
                  <div key={property.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                    <p className="font-bold text-xs text-slate-900">{property.title}</p>
                    <p className="text-xs text-slate-500">{formatPrice(property.price, property.listingType)}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <form action={approveProperty}>
                        <input type="hidden" name="id" value={property.id} />
                        <button type="submit" className="rounded bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-xs font-bold text-white">
                          Approve
                        </button>
                      </form>
                      <form action={rejectProperty}>
                        <input type="hidden" name="id" value={property.id} />
                        <button type="submit" className="rounded border border-red-200 text-red-600 hover:bg-red-50 px-2.5 py-1 text-xs font-bold">
                          Reject
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Inquiries */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Recent Inquiries</h2>
                <p className="text-xs text-slate-500">Customer leads from website forms</p>
              </div>
              <Link href="/admin/enquiries" className="text-xs font-semibold text-blue-600 hover:underline">
                View All →
              </Link>
            </div>

            {recentEnquiries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center bg-white text-xs text-slate-500">
                No recent inquiries.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentEnquiries.map((enquiry) => (
                  <div key={enquiry.id} className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{enquiry.name}</span>
                      <span className="text-[11px] font-semibold text-blue-600">{enquiry.phone}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {enquiry.property?.title ?? "General Consultation"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
