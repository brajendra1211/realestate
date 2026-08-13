import { getPublicListings } from "@/lib/listing";
import { formatINR } from "@/lib/format";
import { PROPERTY_TYPE_LABELS } from "@/lib/format";

type SearchParams = Promise<{ city?: string; listingType?: string }>;

export default async function ListingsPage({ searchParams }: { searchParams: SearchParams }) {
  const { city, listingType } = await searchParams;
  const listings = await getPublicListings({
    city: city || undefined,
    listingType: listingType === "RENT" ? "RENT" : listingType === "SALE" ? "SALE" : undefined,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Agent Listings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Free to browse. Pay ₹100 to unlock exact address and agent contact for any listing.
      </p>

      {listings.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No listings yet.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <a
              key={listing.id}
              href={`/listings/${listing.slug}`}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:shadow-md"
            >
              <div className="aspect-video w-full bg-slate-100">
                {listing.images[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={listing.images[0].url} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="p-4">
                <p className="font-semibold text-slate-900">{formatINR(listing.price)}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {listing.bedrooms ? `${listing.bedrooms} BHK · ` : ""}
                  {PROPERTY_TYPE_LABELS[listing.propertyType] ?? listing.propertyType}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {listing.masterProperty.locality ?? listing.masterProperty.city}
                </p>
                <p className="mt-1 font-mono text-xs text-slate-400">{listing.masterProperty.masterId}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
