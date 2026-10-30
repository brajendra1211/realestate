import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PropertyForm } from "@/components/PropertyForm";
import { OwnerPlanSelection } from "@/components/OwnerPlanSelection";
import { getListingUsage, getActiveSubscription } from "@/lib/listing-quota";
import { getSiteSettings } from "@/lib/site-settings";
import { createProperty } from "../../actions";

type SearchParams = Promise<{ error?: string; planActivated?: string }>;

export default async function NewPropertyPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { error, planActivated } = await searchParams;
  const isAdminLister = session.user.role === "ADMIN" || session.user.role === "SUBADMIN";
  const [usage, activeSub, settings] = await Promise.all([
    getListingUsage(session.user.id, session.user.role),
    getActiveSubscription(session.user.id),
    getSiteSettings(),
  ]);

  if (usage.atLimit && !isAdminLister) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            ← Back to dashboard
          </Link>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
            Paid Plan Required
          </span>
        </div>

        <OwnerPlanSelection
          basicFee={settings.basicListingFee}
          goldFee={settings.goldListingFee}
          userRole={session.user.role}
        />
      </div>
    );
  }

  const amenityOptions = await prisma.amenity.findMany({ orderBy: { order: "asc" } });
  const listAsOptions = isAdminLister
    ? (
        await prisma.user.findMany({
          where: { role: { in: ["DEALER", "OWNER"] } },
          orderBy: [{ role: "asc" }, { name: "asc" }],
        })
      ).map((user) => ({
        id: user.id,
        label: `${user.company ?? user.name} (${user.role === "DEALER" ? "Dealer" : "Owner"})`,
      }))
    : undefined;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add property</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAdminLister
              ? "Listings you create are published immediately."
              : "Your listing will be reviewed by an admin before it appears publicly."}
          </p>
        </div>

        {activeSub && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-right">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Active Plan</span>
            <p className="text-xs font-extrabold text-blue-900">
              {activeSub.plan.name}
              {activeSub.endDate && ` · Valid till ${activeSub.endDate.toLocaleDateString("en-IN")}`}
            </p>
          </div>
        )}
      </div>

      {planActivated === "1" && (
        <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 flex items-center gap-2">
          <span>✓</span>
          <span>Plan activated successfully! You can now submit your property details below.</span>
        </div>
      )}

      {Number.isFinite(usage.limit) && !isAdminLister && (
        <p className="mt-2 text-xs font-medium text-slate-500">
          Listing Quota: {usage.used} of {usage.limit} listing{usage.limit === 1 ? "" : "s"} used ({usage.remaining} remaining).
        </p>
      )}

      {error === "limit" && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          You&apos;ve reached your listing limit. Please choose a plan above to add more properties.
        </p>
      )}
      {error === "location" && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Please select a country, state, and city before submitting.
        </p>
      )}

      <div className="mt-6">
        <PropertyForm
          action={createProperty}
          submitLabel={isAdminLister ? "Publish property" : "Submit for review"}
          amenityOptions={amenityOptions}
          listAsOptions={listAsOptions}
          allowManualCoordinates={isAdminLister}
        />
      </div>
    </div>
  );
}
