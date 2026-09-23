import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { getGoldListingsForAgent } from "@/lib/goldListing";
import { formatINR } from "@/lib/format";

export default async function AgentGoldFeedPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const listings = agent.primeStatus ? await getGoldListingsForAgent(agent.id) : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Direct Customer Listings</h1>
      <p className="mt-1 text-sm text-slate-500">
        Gold Membership self-listings auto-injected within 5 km of your shop — zero manual
        searching (§3.4). Visit and upload your own better-quality photos on top of the same
        Master ID if you want to represent it.
      </p>

      <div className="mt-6 space-y-3">
        {listings.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            {agent.primeStatus
              ? "No direct customer listings nearby right now."
              : "Activate Prime to see nearby direct customer listings."}
          </p>
        ) : (
          listings.map((listing) => (
            <a
              key={listing.id}
              href={`/listings/${listing.slug}`}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-amber-300"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900">{listing.title}</p>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                    Direct Customer Listing
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {listing.masterProperty.masterId} · {formatINR(listing.price)} ·{" "}
                  {Math.round(listing.distanceKm * 10) / 10} km away
                </p>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
