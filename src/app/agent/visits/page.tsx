import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { getVisitLogsForAgent } from "@/lib/visitLog";

type SearchParams = Promise<{ saved?: string; conflict?: string; masterId?: string; originalAgent?: string }>;

export default async function AgentVisitsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session) redirect("/login");
  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const { saved, conflict, masterId, originalAgent } = await searchParams;
  const visits = await getVisitLogsForAgent(agent.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Site Visits</h1>
        <a
          href="/agent/visits/new"
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Log a visit
        </a>
      </div>

      {saved === "1" && (
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Visit logged.</p>
      )}
      {conflict === "1" && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-semibold">🚨 Duplicate-visit conflict on {masterId}</p>
          <p className="mt-1">
            This customer already viewed this Master Property ID with{" "}
            <span className="font-semibold">{originalAgent}</span>. That agent keeps Primary Lead
            Ownership — if this flat sells/rents to this customer, commission rules favor them
            regardless of who closes it (§3.8).
          </p>
        </div>
      )}

      <div className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {visits.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">No visits logged yet.</p>
        ) : (
          visits.map((visit) => (
            <div key={visit.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-slate-900">
                  {visit.masterProperty.masterId} · {visit.customerName ?? visit.customerPhone}
                </p>
                <p className="text-xs text-slate-500">{visit.visitedAt.toLocaleString("en-IN")}</p>
              </div>
              {!visit.isPrimaryOwner && (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                  Duplicate
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
