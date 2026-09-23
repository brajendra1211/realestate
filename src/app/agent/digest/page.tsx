import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { getNewListingsDigest } from "@/lib/digest";

export default async function AgentDigestPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const digest = agent.primeStatus ? await getNewListingsDigest(agent.id) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Daily Digest</h1>
      <p className="mt-1 text-sm text-slate-500">
        New listings within 10 km of your shop in the last 24 hours (§3.2) — also sent to you
        automatically every morning.
      </p>

      {!agent.primeStatus ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Activate Prime to receive the daily digest.
        </p>
      ) : digest!.totalCount === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No new listings nearby in the last 24 hours.
        </p>
      ) : (
        <div className="mt-6">
          <p className="text-sm font-semibold text-slate-900">
            {digest!.totalCount} new listing{digest!.totalCount === 1 ? "" : "s"} nearby today
          </p>
          <div className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {digest!.groups.map((g) => (
              <div key={`${g.locality}-${g.bedrooms}`} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-slate-700">
                  {g.locality} {g.bedrooms ? `· ${g.bedrooms}BHK` : ""}
                </span>
                <span className="font-semibold text-slate-900">{g.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
