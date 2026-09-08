import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { getActiveDispatchesForAgent } from "@/lib/dispatch";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/format";
import { DispatchNotifications } from "@/components/agent/DispatchNotifications";

export default async function AgentDispatchPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const [activeDispatches, acceptedDispatches] = await Promise.all([
    agent.primeStatus ? getActiveDispatchesForAgent(agent.id) : Promise.resolve([]),
    prisma.dispatchRequest.findMany({
      where: { acceptedByAgentId: agent.id },
      include: { buyer: { select: { name: true, phone: true, email: true } } },
      orderBy: { acceptedAt: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Lead Dispatch &amp; Live Calls</h1>
        <p className="mt-1 text-sm text-slate-500">
          Real-time Uber-style cascade dispatch notifications and accepted leads.
        </p>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-slate-900">Incoming Live Leads</h2>
        <div className="mt-3">
          <DispatchNotifications
            agentProfileId={agent.id}
            initial={activeDispatches.map((d) => ({
              dispatchRequestId: d.id,
              batch: d.currentBatch,
              distanceKm: 0,
            }))}
          />
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">Accepted Leads History</h2>
        {acceptedDispatches.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            No accepted leads yet.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
            {acceptedDispatches.map((dispatch) => (
              <div key={dispatch.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold text-slate-900">{dispatch.buyer.name}</p>
                  <p className="text-xs text-slate-500">
                    {dispatch.buyer.phone ? `Phone: ${dispatch.buyer.phone}` : ""}
                    {dispatch.buyer.email ? ` · Email: ${dispatch.buyer.email}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Accepted {dispatch.acceptedAt ? dispatch.acceptedAt.toLocaleString("en-IN") : "Recently"} · Split {formatINR(dispatch.agentSplit)}
                  </p>
                </div>
                <a
                  href={`/agent/dispatch/${dispatch.id}`}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  View Contact &amp; Schedule Visit →
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
