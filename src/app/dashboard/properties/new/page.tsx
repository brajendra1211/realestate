import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PropertyForm } from "@/components/PropertyForm";
import { getListingUsage } from "@/lib/listing-quota";
import { getSiteSettings } from "@/lib/site-settings";
import { createProperty } from "../../actions";

type SearchParams = Promise<{ error?: string }>;

export default async function NewPropertyPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { error } = await searchParams;
  const usage = await getListingUsage(session.user.id, session.user.role);

  if (usage.atLimit) {
    const [plans, settings] = await Promise.all([
      prisma.plan.findMany({
        where: { active: true, OR: [{ role: session.user.role as "OWNER" | "DEALER" }, { role: "BOTH" }] },
        orderBy: { price: "asc" },
      }),
      getSiteSettings(),
    ]);

    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Add property</h1>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="font-semibold text-amber-800">
            You&apos;ve used all {usage.limit} free listing{usage.limit === 1 ? "" : "s"}.
          </p>
          <p className="mt-1 text-sm text-amber-700">
            Upgrade your plan to add more listings. Reach out to us and we&apos;ll get you set up.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            {settings.contactPhone && (
              <a href={`tel:${settings.contactPhone}`} className="rounded-lg bg-white px-4 py-2 font-medium text-amber-800 shadow-sm">
                Call {settings.contactPhone}
              </a>
            )}
            {settings.whatsappNumber && (
              <a
                href={`https://wa.me/${settings.whatsappNumber.replace(/[^\d]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white shadow-sm"
              >
                WhatsApp us
              </a>
            )}
            {settings.contactEmail && (
              <a href={`mailto:${settings.contactEmail}`} className="rounded-lg bg-white px-4 py-2 font-medium text-amber-800 shadow-sm">
                Email us
              </a>
            )}
          </div>
        </div>

        {plans.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900">Available plans</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {plans.map((plan) => (
                <div key={plan.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="font-semibold text-slate-900">{plan.name}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {plan.price === 0 ? "Free" : `₹${plan.price.toLocaleString("en-IN")}`}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Up to {plan.listingLimit} listings ·{" "}
                    {plan.leadLimit === null ? "Unlimited" : plan.leadLimit} leads
                    {plan.durationDays ? ` · ${plan.durationDays} days` : " · No expiry"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <Link
          href="/dashboard"
          className="mt-8 inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const amenityOptions = await prisma.amenity.findMany({ orderBy: { order: "asc" } });
  const isAdminLister = session.user.role === "ADMIN" || session.user.role === "SUBADMIN";
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
      <h1 className="text-2xl font-bold text-slate-900">Add property</h1>
      <p className="mt-1 text-sm text-slate-500">
        {isAdminLister
          ? "Listings you create are published immediately."
          : "Your listing will be reviewed by an admin before it appears publicly."}
      </p>
      {Number.isFinite(usage.limit) && (
        <p className="mt-1 text-sm text-slate-500">
          {usage.used} of {usage.limit} listing{usage.limit === 1 ? "" : "s"} used.
        </p>
      )}

      {error === "limit" && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          You&apos;ve reached your listing limit.
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
