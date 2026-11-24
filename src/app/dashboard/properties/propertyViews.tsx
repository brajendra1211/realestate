import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PropertyForm } from "@/components/PropertyForm";
import { OwnerPlanSelection } from "@/components/OwnerPlanSelection";
import { getListingUsage, getActiveSubscription } from "@/lib/listing-quota";
import { getSiteSettings } from "@/lib/site-settings";
import { createProperty, updateProperty, deleteProperty } from "../actions";

/**
 * The add/edit property screens, shared by the owner dashboard and the admin console.
 * "admin" renders inside the admin layout (admin sidebar, no public chrome) and sends
 * every link back to /admin/properties; "dashboard" is the owner/dealer view.
 */
export type PropertyArea = "admin" | "dashboard";

function BackLink({ area }: { area: PropertyArea }) {
  return area === "admin" ? (
    <Link href="/admin/properties" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline">
      <ArrowLeft className="h-4 w-4" /> All properties
    </Link>
  ) : null;
}

export async function EditPropertyView({
  area,
  id,
  saved,
  error,
}: {
  area: PropertyArea;
  id: string;
  saved?: string;
  error?: string;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const property = await prisma.property.findUnique({
    where: { id },
    include: { images: { orderBy: { order: "asc" } } },
  });

  if (!property) notFound();
  const isAdminLike = session.user.role === "ADMIN" || session.user.role === "SUBADMIN";
  if (!isAdminLike && property.ownerId !== session.user.id) {
    redirect("/dashboard");
  }

  const matchedCity = await prisma.city.findFirst({
    where: { name: property.city },
    select: { id: true, stateId: true, state: { select: { countryId: true } } },
  });
  const matchedLocality =
    matchedCity && property.locality
      ? await prisma.locality.findFirst({
          where: { cityId: matchedCity.id, name: property.locality },
          select: { id: true },
        })
      : null;

  const amenityOptions = await prisma.amenity.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <BackLink area={area} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Edit property</h1>
        <form action={deleteProperty}>
          <input type="hidden" name="id" value={property.id} />
          <button
            type="submit"
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete listing
          </button>
        </form>
      </div>

      {saved === "1" && (
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Saved. {!isAdminLike && "It will be reviewed before going live."}
        </p>
      )}
      {error === "location" && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Please select a country, state, and city before submitting.
        </p>
      )}

      <div className="mt-6">
        <PropertyForm
          action={updateProperty}
          submitLabel="Save changes"
          amenityOptions={amenityOptions}
          allowManualCoordinates={isAdminLike}
          defaultValues={{
            id: property.id,
            title: property.title,
            description: property.description,
            listingType: property.listingType,
            condition: property.condition,
            propertyType: property.propertyType,
            price: property.price,
            priceNegotiable: property.priceNegotiable,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            areaSqft: property.areaSqft,
            city: property.city,
            locality: property.locality,
            address: property.address,
            amenities: property.amenities,
            contactName: property.contactName,
            contactPhone: property.contactPhone,
            contactEmail: property.contactEmail,
            images: property.images.map((image) => ({ url: image.url, category: image.category })),
            brochureUrl: property.brochureUrl,
            youtubeUrl: property.youtubeUrl,
            countryId: matchedCity?.state.countryId ?? null,
            stateId: matchedCity?.stateId ?? null,
            cityId: matchedCity?.id ?? null,
            localityId: matchedLocality?.id ?? null,
            projectId: property.projectId,
            commercialSubtype: property.commercialSubtype,
            pgGender: property.pgGender,
            pgSharing: property.pgSharing,
            foodIncluded: property.foodIncluded,
            furnishing: property.furnishing,
            floorNumber: property.floorNumber,
            totalFloors: property.totalFloors,
            carpetAreaSqft: property.carpetAreaSqft,
            superAreaSqft: property.superAreaSqft,
            facingDirection: property.facingDirection,
            maintenanceCharges: property.maintenanceCharges,
            securityDeposit: property.securityDeposit,
            possessionStatus: property.possessionStatus,
            bachelorFriendly: property.bachelorFriendly,
            reraNumber: property.reraNumber,
            societyName: property.societyName,
          }}
          isAdmin={isAdminLike}
        />
      </div>
    </div>
  );
}

export async function NewPropertyView({
  area,
  error,
  planActivated,
}: {
  area: PropertyArea;
  error?: string;
  planActivated?: string;
}) {
  const session = await auth();
  if (!session) redirect("/login");

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
          where: { role: "OWNER" },
          orderBy: [{ role: "asc" }, { name: "asc" }],
        })
      ).map((user) => ({
        id: user.id,
        label: `${user.company ?? user.name} (${"Owner"})`,
      }))
    : undefined;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <BackLink area={area} />
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
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
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
          isAdmin={isAdminLister}
        />
      </div>
    </div>
  );
}
