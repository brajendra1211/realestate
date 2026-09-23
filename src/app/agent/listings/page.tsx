import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { getListingsForAgent } from "@/lib/listing";
import { getAgreementUrgency } from "@/lib/listingDelist";
import { formatINR } from "@/lib/format";
import { renewListingAction } from "./actions";

type SearchParams = Promise<{ saved?: string; error?: string }>;

export default async function AgentListingsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session) redirect("/login");

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const { saved, error } = await searchParams;
  const listings = await getListingsForAgent(agent.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Listings</h1>
          <p className="mt-1 text-xs text-slate-500">
            PDF 1 & 2: Basic (30d) vs Gold (90d) auto-delist validity and 6-month agreement countdown.
          </p>
        </div>
        <a
          href="/agent/listings/new"
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          List a Property
        </a>
      </div>

      {saved === "renewed" && (
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Listing renewed successfully! Validity extended and 50% split credited to wallet.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Failed to renew listing. Please verify your balance and try again.
        </p>
      )}

      {listings.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">You haven&apos;t listed any properties yet.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {listings.map((listing) => {
            const urgency = getAgreementUrgency(listing.agreementExpiryDate, listing.agreementStartDate);
            const now = new Date();
            const daysToDelist = listing.listingExpiresAt
              ? Math.max(0, Math.ceil((listing.listingExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
              : 30;

            return (
              <div
                key={listing.id}
                className={`rounded-xl border p-4 transition ${
                  listing.isDelisted
                    ? "border-red-200 bg-red-50/50"
                    : urgency.tier === "HOT_DEAL"
                      ? "border-red-300 bg-red-50/30"
                      : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex-1 min-w-[240px]">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{listing.title}</p>
                      {listing.isDelisted ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                          Auto-Delisted (Expired)
                        </span>
                      ) : (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            urgency.tier === "HOT_DEAL"
                              ? "bg-red-100 text-red-800 animate-pulse"
                              : urgency.tier === "PRIORITY"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-green-100 text-green-800"
                          }`}
                        >
                          {urgency.badge} ({urgency.daysRemaining}d left)
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      <span className="font-mono">{listing.masterProperty.masterId}</span> ·{" "}
                      {listing.masterProperty.locality ?? listing.masterProperty.city} ·{" "}
                      {formatINR(listing.price)} · Plan:{" "}
                      <span className="font-medium">{listing.listingPlan}</span>
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>{listing.images.length} photo(s)</span>
                      <span>·</span>
                      <span>{listing._count.unlocks} unlock(s)</span>
                      <span>·</span>
                      {!listing.isDelisted ? (
                        <span className={daysToDelist <= 7 ? "font-semibold text-amber-600" : ""}>
                          Validity: {daysToDelist} days remaining
                        </span>
                      ) : (
                        <span className="font-semibold text-red-600">Archived from public feed</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`/listings/${listing.slug}`}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      View
                    </a>

                    {(listing.isDelisted || daysToDelist <= 7) && (
                      <form action={renewListingAction} className="flex items-center gap-1">
                        <input type="hidden" name="listingId" value={listing.id} />
                        <button
                          type="submit"
                          name="planTier"
                          value="BASIC"
                          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
                        >
                          Renew Basic (₹200 / 30d)
                        </button>
                        <button
                          type="submit"
                          name="planTier"
                          value="GOLD"
                          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
                        >
                          Renew Gold (₹500 / 90d)
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
