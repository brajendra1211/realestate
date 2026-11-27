import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId } from "@/lib/agent";
import { getVisitLogsForAgent, getCustomerVisitHistory } from "@/lib/visitLog";
import { SmartInput } from "@/components/forms/FormKit";

type SearchParams = Promise<{ saved?: string; conflict?: string; masterId?: string; originalAgent?: string; phone?: string; code?: string }>;

export default async function AgentVisitsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session) redirect("/login");
  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const { saved, conflict, masterId, originalAgent, phone, code } = await searchParams;
  const visits = await getVisitLogsForAgent(agent.id);
  const lookupDigits = (phone ?? "").replace(/\D/g, "").slice(-10);
  const history = lookupDigits.length >= 10 ? await getCustomerVisitHistory(lookupDigits) : [];
  const propertyRows = [...history.reduce((m, h) => {
    const code = h.masterProperty.masterId;
    const row = m.get(code) ?? { code, times: 0, agents: new Map<string, { code: string; mine: boolean; times: number }>() };
    row.times += 1;
    const ag = row.agents.get((h.agent.agentCode ?? "—")) ?? { code: (h.agent.agentCode ?? "—"), mine: h.agentId === agent.id, times: 0 };
    ag.times += 1;
    row.agents.set(ag.code, ag);
    m.set(code, row);
    return m;
  }, new Map<string, { code: string; times: number; agents: Map<string, { code: string; mine: boolean; times: number }> }>()).values()].map((r) => ({
    ...r,
    agents: [...r.agents.values()],
  }));
  const checkCode = (code ?? "").trim().toUpperCase();
  const shownByOthers = checkCode
    ? [...new Set(history.filter((h) => h.masterProperty.masterId.toUpperCase() === checkCode && h.agentId !== agent.id).map((h) => (h.agent.agentCode ?? "—")))]
    : [];
  const shownByMe = checkCode ? history.some((h) => h.masterProperty.masterId.toUpperCase() === checkCode && h.agentId === agent.id) : false;

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

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-bold text-slate-900">Customer ne ab tak kitni property dekhi?</h2>
        <form method="get" className="mt-2 flex gap-2">
          <SmartInput kind="mobile"
            name="phone"
            defaultValue={phone ?? ""}
            inputMode="numeric"
            placeholder="Customer mobile number"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="code"
            defaultValue={code ?? ""}
            placeholder="Property code (optional)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
          />
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Check
          </button>
        </form>
        {lookupDigits.length >= 10 &&
          (history.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Is customer ne abhi tak koi property nahi dekhi.</p>
          ) : (
            <div className="mt-3">
              <p className="text-sm font-semibold text-slate-800">
                Customer •••••{lookupDigits.slice(-5)} · {new Set(history.map((h) => h.masterPropertyId)).size} property dekhi
              </p>
              {checkCode && (
                shownByOthers.length > 0 ? (
                  <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
                    🚨 {checkCode} yeh customer pehle hi {shownByOthers.join(", ")} ke saath dekh chuka hai.
                  </p>
                ) : (
                  <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
                    {shownByMe ? `${checkCode} aap pehle hi dikha chuke ho.` : `✅ ${checkCode} kisi aur agent ne is customer ko nahi dikhayi.`}
                  </p>
                )
              )}
              <ul className="mt-2 divide-y divide-slate-100 text-sm">
                {propertyRows.map((r) => (
                  <li key={r.code} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      <span className="font-mono font-medium">{r.code}</span>{" "}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {r.times} baar dekhi
                      </span>
                    </span>
                    <span className="text-xs text-slate-500">
                      {r.agents.map((a) => (
                        <span key={a.code} className="ml-2">
                          <span className="font-mono font-semibold">{a.code}</span>
                          {a.mine ? " (aap)" : ""} ×{a.times}
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </section>

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
