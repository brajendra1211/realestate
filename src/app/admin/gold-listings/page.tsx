import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getGoldListingsForModeration } from "@/lib/goldListing";
import { formatINR } from "@/lib/format";
import { approveGoldListingAction, rejectGoldListingAction } from "./actions";

type SearchParams = Promise<{ saved?: string }>;

export default async function AdminGoldListingsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { saved } = await searchParams;
  const listings = await getGoldListingsForModeration();

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <h1 className="text-2xl font-bold text-slate-900">Gold Listing Moderation</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Anti-fake-listing check before a customer&apos;s self-listing goes live and gets
        auto-injected into nearby Prime agents&apos; CRM (§3.4). The ₹500 referral commission
        (if any) was already credited on payment — approval only gates visibility.
      </p>

      {saved === "approved" && (
        <p className="mt-4 max-w-2xl rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Approved — now live and pushed to nearby agents.
        </p>
      )}
      {saved === "rejected" && (
        <p className="mt-4 max-w-2xl rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Rejected.
        </p>
      )}

      <div className="mt-6 space-y-3">
        {listings.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            Nothing pending moderation.
          </p>
        ) : (
          listings.map((listing) => (
            <div key={listing.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    {listing.title} — {formatINR(listing.price)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {listing.masterProperty.masterId} · {listing.masterProperty.city}
                    {listing.masterProperty.locality && `, ${listing.masterProperty.locality}`}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Purchase: {listing.goldPurchase ? formatINR(listing.goldPurchase.amount) : "—"}
                    {listing.goldPurchase?.agentSplit ? ` (₹${listing.goldPurchase.agentSplit} referral credited)` : " (no referring agent)"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={approveGoldListingAction}>
                    <input type="hidden" name="id" value={listing.id} />
                    <button
                      type="submit"
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                    >
                      Approve
                    </button>
                  </form>
                  <form action={rejectGoldListingAction}>
                    <input type="hidden" name="id" value={listing.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </div>
              {listing.images.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {listing.images.map((image) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={image.id}
                      src={image.url}
                      alt=""
                      className="h-20 w-28 flex-shrink-0 rounded-lg object-cover"
                    />
                  ))}
                </div>
              )}
              {listing.videoUrl && (
                <a
                  href={listing.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs text-blue-600 hover:underline"
                >
                  View video tour →
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
