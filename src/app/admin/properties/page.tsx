import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/format";

const APPROVAL_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-green-50 text-green-700",
  REJECTED: "bg-red-50 text-red-700",
};

export default async function AdminPropertiesPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const properties = await prisma.property.findMany({
    include: { owner: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">All properties</h1>
        <p className="mt-1 text-sm text-slate-500">{properties.length} total listings</p>
      </div>

      <div className="mt-6 space-y-3">
        {properties.map((property) => (
          <div
            key={property.id}
            className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900">{property.title}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${APPROVAL_STYLES[property.approvalStatus]}`}
                >
                  {property.approvalStatus}
                </span>
              </div>
              <p className="text-sm text-slate-500">
                {[property.locality, property.city].filter(Boolean).join(", ")} ·{" "}
                {formatPrice(property.price, property.listingType)}
              </p>
              <p className="text-xs text-slate-400">
                by {property.owner.name} ({property.owner.email})
              </p>
            </div>
            <Link
              href={`/dashboard/properties/${property.id}/edit`}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Manage
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
