import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { getListingsForAgent } from "@/lib/listing";
import { formatINR } from "@/lib/format";

export default async function AgentListingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const listings = await getListingsForAgent(agent.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">My Listings</h1>
        <a
          href="/agent/listings/new"
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          List a Property
        </a>
      </div>

      {listings.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">You haven&apos;t listed any properties yet.</p>
      ) : (
        <div className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {listings.map((listing) => (
            <div key={listing.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-semibold text-slate-900">{listing.title}</p>
                <p className="text-xs text-slate-500">
                  <span className="font-mono">{listing.masterProperty.masterId}</span> ·{" "}
                  {listing.masterProperty.locality ?? listing.masterProperty.city} ·{" "}
                  {formatINR(listing.price)}
                </p>
                <p className="text-xs text-slate-400">
                  {listing.images.length} photo(s) · {listing._count.unlocks} unlock(s)
                </p>
              </div>
              <a href={`/listings/${listing.slug}`} className="text-xs font-medium text-blue-600 hover:underline">
                View public page
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
