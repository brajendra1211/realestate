import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PropertyForm } from "@/components/PropertyForm";
import { updateProperty, deleteProperty } from "../../../actions";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ saved?: string; error?: string }>;

export default async function EditPropertyPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const { saved, error } = await searchParams;

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
          }}
        />
      </div>
    </div>
  );
}
