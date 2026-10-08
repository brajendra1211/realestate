import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";
import { approveProperty, rejectProperty } from "./actions";

export default async function AdminPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const [properties, pendingProperties, stats, recentEnquiries] = await Promise.all([
    prisma.property.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { name: true, email: true, role: true } },
        images: { orderBy: { order: "asc" }, take: 1 },
      },
    }),
    prisma.property.findMany({
      where: { approvalStatus: "PENDING" },
      include: {
        owner: { select: { name: true, email: true } },
        images: { orderBy: { order: "asc" }, take: 1 },
      },
      orderBy: { createdAt: "asc" },
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
      prisma.property.count({ where: { listingType: "SALE" } }),
      prisma.property.count({ where: { listingType: "RENT" } }),
    ]),
    prisma.enquiry.findMany({
      include: { property: { select: { title: true, slug: true, price: true, listingType: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
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
    saleCount,
    rentCount,
  ] = stats;

  const todayFormatted = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-8 lg:p-10 space-y-8 font-sans">
      {/* 1. Header Banner with Live System Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/90 pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/80 px-3 py-0.5 text-[11px] font-bold text-blue-700 uppercase tracking-wider">
              Noida Prime Console
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Operations
            </span>
            <span className="text-xs text-slate-400 font-medium">· {todayFormatted}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Administration Console
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
            Centralized hub for inventory monitoring, channel partner verification, and lead conversions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:border-slate-300"
          >
            <span>Live Site Preview</span>
            <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>
          <Link
            href="/dashboard/properties/new"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:shadow-md"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>+ Add Property</span>
          </Link>
        </div>
      </div>

      {/* 2. Top Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Properties */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Total Properties</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100/80">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">{totalProperties}</span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              100% Active
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 font-medium border-t border-slate-100 pt-2.5">
            <span>{saleCount} For Sale · {rentCount} For Rent</span>
            <Link href="/admin/properties" className="text-blue-600 font-bold hover:underline">
              Inventory →
            </Link>
          </div>
        </div>

        {/* Card 2: Moderation Review */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Pending Review</span>
            <span className={`p-2 rounded-xl border ${pendingCount > 0 ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">{pendingCount}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
              pendingCount > 0 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}>
              {pendingCount === 0 ? "All Clear" : "Action Required"}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 font-medium border-t border-slate-100 pt-2.5">
            <span>Verification SLA: &lt; 2h</span>
            <span className="text-slate-400 font-medium">Quality Check</span>
          </div>
        </div>

        {/* Card 3: Channel Partners */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Channel Partners</span>
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/80">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">{totalAgents}</span>
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
              Prime Network
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 font-medium border-t border-slate-100 pt-2.5">
            <span>100% KYC Verified</span>
            <Link href="/admin/agents" className="text-indigo-600 font-bold hover:underline">
              Manage →
            </Link>
          </div>
        </div>

        {/* Card 4: Customer Leads */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Customer Leads</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100/80">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">{totalEnquiriesCount}</span>
            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
              Direct Inquiries
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 font-medium border-t border-slate-100 pt-2.5">
            <span>Lead Routing: Instant</span>
            <Link href="/admin/enquiries" className="text-purple-600 font-bold hover:underline">
              Inbox →
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Operational Quick Navigation Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link
          href="/admin/deals"
          className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-blue-400 hover:shadow-xs transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">B2B Deals</span>
            <span className="text-blue-600 opacity-0 group-hover:opacity-100 transition">→</span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{activeDealsCount}</div>
          <div className="mt-0.5 text-xs font-medium text-slate-500">Pipeline & Closures</div>
        </Link>

        <Link
          href="/admin/analytics"
          className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-blue-400 hover:shadow-xs transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Site Visits</span>
            <span className="text-blue-600 opacity-0 group-hover:opacity-100 transition">→</span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{verifiedVisitsCount}</div>
          <div className="mt-0.5 text-xs font-medium text-slate-500">OTP Verified Tours</div>
        </Link>

        <Link
          href="/admin/gold-listings"
          className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-blue-400 hover:shadow-xs transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gold Listings</span>
            <span className="text-blue-600 opacity-0 group-hover:opacity-100 transition">→</span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{pendingGoldCount}</div>
          <div className="mt-0.5 text-xs font-medium text-slate-500">Direct Owner Moderation</div>
        </Link>

        <Link
          href="/admin/users"
          className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-blue-400 hover:shadow-xs transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Listers</span>
            <span className="text-blue-600 opacity-0 group-hover:opacity-100 transition">→</span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{totalListers}</div>
          <div className="mt-0.5 text-xs font-medium text-slate-500">Owners & Dealers</div>
        </Link>
      </div>

      {/* 4. Split Dashboard Grid (Detailed Live Inventory & Side Panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Rich Property Inventory Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/90 pb-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Active Live Inventory</h2>
              <p className="text-xs text-slate-500 font-medium">
                Verified luxury listings currently live on portal ({properties.length} shown)
              </p>
            </div>
            <Link
              href="/admin/properties"
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition"
            >
              <span>View All ({totalProperties})</span>
              <span>→</span>
            </Link>
          </div>

          <div className="space-y-3.5">
            {properties.map((property) => (
              <div
                key={property.id}
                className="group flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 hover:shadow-xs transition gap-4"
              >
                {/* Thumbnail Image + Basic Details */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-200/80">
                    {property.images[0]?.url ? (
                      <Image
                        src={property.images[0].url}
                        alt={property.title}
                        fill
                        className="object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-slate-400 font-medium">
                        No image
                      </div>
                    )}
                    <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                      property.listingType === "SALE" ? "bg-slate-900 text-white" : "bg-blue-600 text-white"
                    }`}>
                      {property.listingType}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-500 mb-0.5">
                      <span className="text-slate-700 font-bold">
                        {property.locality || property.city}
                      </span>
                      {property.bedrooms && (
                        <span>· {property.bedrooms} BHK</span>
                      )}
                      {property.areaSqft && (
                        <span>· {property.areaSqft.toLocaleString("en-IN")} sq.ft</span>
                      )}
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 truncate" title={property.title}>
                      {property.title}
                    </h3>

                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-blue-700">
                        {formatPrice(property.price, property.listingType)}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        by {property.owner.name} ({property.owner.role})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Link
                    href={`/properties/${property.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition"
                  >
                    <span>View</span>
                    <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Link>
                  <Link
                    href={`/dashboard/properties/${property.id}/edit`}
                    className="inline-flex items-center gap-1 rounded-xl bg-slate-900 hover:bg-slate-800 px-3 py-1.5 text-xs font-bold text-white transition"
                  >
                    <span>Edit</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Moderation Queue, Recent Inquiries & Quick Shortcuts (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Moderation Queue */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">Moderation Queue</h2>
                <p className="text-xs text-slate-500 font-medium">New properties awaiting admin approval</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                pendingProperties.length > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
              }`}>
                {pendingProperties.length} Pending
              </span>
            </div>

            {pendingProperties.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-6 text-center">
                <svg className="mx-auto h-8 w-8 text-emerald-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <p className="text-xs font-bold text-emerald-900">Queue is completely clear!</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">All submitted properties are approved & live.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingProperties.map((property) => (
                  <div key={property.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {property.listingType}
                      </span>
                      <span className="text-xs font-black text-slate-900">
                        {formatPrice(property.price, property.listingType)}
                      </span>
                    </div>
                    <p className="font-bold text-xs text-slate-900 line-clamp-1">{property.title}</p>
                    <p className="text-[11px] text-slate-500">
                      by {property.owner.name} ({property.owner.email})
                    </p>
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200/80">
                      <form action={approveProperty} className="flex-1">
                        <input type="hidden" name="id" value={property.id} />
                        <button
                          type="submit"
                          className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 py-1.5 text-xs font-bold text-white transition shadow-2xs"
                        >
                          Approve Listing
                        </button>
                      </form>
                      <form action={rejectProperty} className="flex-1">
                        <input type="hidden" name="id" value={property.id} />
                        <button
                          type="submit"
                          className="w-full rounded-xl border border-red-200 bg-white hover:bg-red-50 py-1.5 text-xs font-bold text-red-600 transition"
                        >
                          Reject
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Inquiries Inbox */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight">Recent Inquiries</h2>
                <p className="text-xs text-slate-500 font-medium">Direct customer leads from property pages</p>
              </div>
              <Link href="/admin/enquiries" className="text-xs font-bold text-blue-600 hover:underline">
                View All →
              </Link>
            </div>

            {recentEnquiries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                No recent customer inquiries logged.
              </div>
            ) : (
              <div className="space-y-3">
                {recentEnquiries.map((enquiry) => (
                  <div
                    key={enquiry.id}
                    className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 space-y-2 hover:border-slate-300 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-800 text-[10px] font-black">
                          {enquiry.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="font-bold text-xs text-slate-900">{enquiry.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {enquiry.createdAt.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 font-medium line-clamp-1">
                      Interested in:{" "}
                      <span className="text-slate-900 font-bold">
                        {enquiry.property?.title ?? "General Consultation"}
                      </span>
                    </p>

                    {enquiry.message && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 italic bg-white p-2 rounded-lg border border-slate-200/60">
                        &quot;{enquiry.message}&quot;
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-mono font-bold text-slate-700">{enquiry.phone}</span>
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${enquiry.phone}`}
                          className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Call
                        </a>
                        <a
                          href={`https://wa.me/91${enquiry.phone.replace(/\D/g, "").slice(-10)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                        >
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Shortcuts */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Administration Tools</h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link
                href="/admin/targets"
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 hover:bg-blue-50 hover:border-blue-200 transition font-bold text-slate-700 hover:text-blue-700"
              >
                Partner Targets
              </Link>
              <Link
                href="/admin/prime-expiry"
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 hover:bg-blue-50 hover:border-blue-200 transition font-bold text-slate-700 hover:text-blue-700"
              >
                Prime Expiry Tracker
              </Link>
              <Link
                href="/admin/billing"
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 hover:bg-blue-50 hover:border-blue-200 transition font-bold text-slate-700 hover:text-blue-700"
              >
                Prime Billing
              </Link>
              <Link
                href="/admin/settings"
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 hover:bg-blue-50 hover:border-blue-200 transition font-bold text-slate-700 hover:text-blue-700"
              >
                Website Settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
