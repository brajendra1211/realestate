import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";

const APPROVAL_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  REJECTED: "bg-red-50 text-red-800 border-red-200",
};

export default async function AdminPropertiesPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const properties = await prisma.property.findMany({
    include: {
      owner: { select: { name: true, email: true, role: true } },
      images: { orderBy: { order: "asc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-8 lg:p-10 space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link href="/admin" className="text-xs font-bold text-blue-600 hover:underline">
              ← Console Overview
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-500">Inventory Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            All Property Listings
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
            Complete database of {properties.length} live and moderated listings across Noida & NCR.
          </p>
        </div>

        <Link
          href="/dashboard/properties/new"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Add New Property</span>
        </Link>
      </div>

      <div className="space-y-3.5">
        {properties.map((property) => (
          <div
            key={property.id}
            className="group flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-2xl border border-slate-200 bg-white p-4.5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition gap-4"
          >
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-200/80">
                {property.images[0]?.url ? (
                  <Image
                    src={property.images[0].url}
                    alt={property.title}
                    fill
                    className="object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    No photo
                  </div>
                )}
                <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                  property.listingType === "SALE" ? "bg-slate-900 text-white" : "bg-blue-600 text-white"
                }`}>
                  {property.listingType}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${APPROVAL_STYLES[property.approvalStatus]}`}>
                    {property.approvalStatus}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {property.locality ? `${property.locality}, ${property.city}` : property.city}
                  </span>
                  {property.bedrooms && (
                    <span className="text-xs font-semibold text-slate-500">· {property.bedrooms} BHK</span>
                  )}
                  {property.areaSqft && (
                    <span className="text-xs font-semibold text-slate-500">· {property.areaSqft.toLocaleString("en-IN")} sq.ft</span>
                  )}
                </div>

                <h3 className="font-bold text-base text-slate-900 truncate" title={property.title}>
                  {property.title}
                </h3>

                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <span className="text-base font-black text-blue-700">
                    {formatPrice(property.price, property.listingType)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Owner: <span className="text-slate-800 font-semibold">{property.owner.name}</span> ({property.owner.role})
                  </span>
                  <span className="text-xs text-slate-400">
                    {property.owner.email}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
              <Link
                href={`/properties/${property.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 transition"
              >
                <span>Live View</span>
                <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
              <Link
                href={`/dashboard/properties/${property.id}/edit`}
                className="inline-flex items-center gap-1 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-white transition"
              >
                <span>Edit / Manage</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
