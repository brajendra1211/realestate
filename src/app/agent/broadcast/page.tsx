import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { getBroadcastsForAgent, getOwnBroadcasts } from "@/lib/broadcast";
import { formatINR } from "@/lib/format";
import { respondToBroadcastAction, closeBroadcastAction } from "./actions";

type SearchParams = Promise<{ saved?: string; error?: string }>;

const TXN_LABELS: Record<string, string> = { BUY: "Buy", RENT: "Rent", SELL: "Sell", LETOUT: "Letout" };

export default async function AgentBroadcastPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session) redirect("/login");
  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");
  if (agent.status !== "APPROVED" || !agent.primeStatus) redirect("/agent/dashboard");

  const { saved, error } = await searchParams;
  const [incoming, own] = await Promise.all([
    getBroadcastsForAgent(agent.id),
    getOwnBroadcasts(agent.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">B2B Broadcast</h1>
        <a
          href="/agent/broadcast/new"
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Post a requirement
        </a>
      </div>

      {saved === "1" && (
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Requirement broadcast to nearby agents.
        </p>
      )}
      {saved === "closed" && (
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Closed.</p>
      )}
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Something went wrong. Try again.
        </p>
      )}

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Nearby requirements</h2>
      <div className="mt-3 space-y-2">
        {incoming.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            No open requirements near you right now.
          </p>
        ) : (
          incoming.map((broadcast) => (
            <div
              key={broadcast.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {broadcast.flatSize} · {TXN_LABELS[broadcast.txnType]}
                  {broadcast.society ? ` · ${broadcast.society}` : ""}
                </p>
                <p className="text-xs text-slate-500">
                  {formatINR(broadcast.budgetMin)} – {formatINR(broadcast.budgetMax)} ·{" "}
                  {broadcast.agent.agentCode} · {Math.round(broadcast.distanceKm * 10) / 10} km away
                </p>
              </div>
              {broadcast.responses.some((r) => r.agentId === agent.id) ? (
                <a
                  href={`/agent/broadcast/${broadcast.id}/chat/${broadcast.agentId}`}
                  className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                >
                  Open chat
                </a>
              ) : (
                <form action={respondToBroadcastAction}>
                  <input type="hidden" name="broadcastId" value={broadcast.id} />
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    I Have This Property
                  </button>
                </form>
              )}
            </div>
          ))
        )}
      </div>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Your posted requirements</h2>
      <div className="mt-3 space-y-2">
        {own.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            You haven&apos;t posted any requirements yet.
          </p>
        ) : (
          own.map((broadcast) => (
            <div key={broadcast.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">
                  {broadcast.flatSize} · {TXN_LABELS[broadcast.txnType]}
                  {broadcast.society ? ` · ${broadcast.society}` : ""}
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    broadcast.status === "OPEN" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {broadcast.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {formatINR(broadcast.budgetMin)} – {formatINR(broadcast.budgetMax)}
              </p>
              {broadcast.responses.length > 0 && (
                <div className="mt-2 space-y-1">
                  {broadcast.responses.map((response) => (
                    <a
                      key={response.agentId}
                      href={`/agent/broadcast/${broadcast.id}/chat/${response.agentId}`}
                      className="block text-sm text-blue-600 hover:underline"
                    >
                      Chat with {response.agent.agentCode} ({response.agent.user.name})
                    </a>
                  ))}
                </div>
              )}
              {broadcast.status === "OPEN" && (
                <form action={closeBroadcastAction} className="mt-2">
                  <input type="hidden" name="broadcastId" value={broadcast.id} />
                  <button type="submit" className="text-xs font-medium text-slate-500 hover:underline">
                    Close requirement
                  </button>
                </form>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
