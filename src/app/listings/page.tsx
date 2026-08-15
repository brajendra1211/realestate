import Link from "next/link";
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agent Listings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Free to browse. Pay ₹100 to unlock exact address and agent contact for any listing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dispatch/new"
            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Find a nearby agent
          </Link>
          <Link
            href="/list-property/gold"
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 2l2.6 6.5L21 9l-5 4.5L17.5 21 12 17.5 6.5 21 8 13.5 3 9l6.4-.5z" />
            </svg>
            List your property (₹500)
          </Link>
          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 19V6l7 4.5V19M4 19h16" />
            </svg>
            Agent leaderboard
          </Link>
        </div>
      </div>

      {listings.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          <svg viewBox="0 0 24 24" fill="none" className="mx-auto h-10 w-10 text-slate-300">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 21V8l8-5 8 5v13M9 21v-6h6v6M4 21h16" />
          </svg>
          <p className="mt-3">No listings yet.</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <a
              key={listing.id}
              href={`/listings/${listing.slug}`}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-900/10"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                {listing.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={listing.images[0].url}
                    alt=""
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">No photo</div>
                )}
                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
                  🔒 Unlock for ₹100
                </span>
              </div>
              <div className="p-4">
                <p className="text-lg font-bold text-slate-900">{formatINR(listing.price)}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {listing.bedrooms ? `${listing.bedrooms} BHK · ` : ""}
                  {PROPERTY_TYPE_LABELS[listing.propertyType] ?? listing.propertyType}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 21s-7-6.1-7-11a7 7 0 1114 0c0 4.9-7 11-7 11z" />
                    <circle cx="12" cy="10" r="2.5" strokeWidth={1.75} />
                  </svg>
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
