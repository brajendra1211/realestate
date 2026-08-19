import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { listAreaAssignments } from "@/lib/areaRouting";
import { createAreaAssignmentAction, deleteAreaAssignmentAction } from "./actions";

type SearchParams = Promise<{ error?: string }>;

const ERROR_MESSAGES: Record<string, string> = {
  validation: "Enter a pincode and pick an agent.",
  agentNotFound: "That agent could not be found.",
  duplicate: "This agent is already assigned to that pincode.",
};

export default async function AreaRoutingPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { error } = await searchParams;

  const [assignments, agents] = await Promise.all([
    listAreaAssignments(),
    prisma.agentProfile.findMany({
      where: { status: "APPROVED" },
      select: { id: true, agentCode: true, primeStatus: true, user: { select: { name: true } } },
      orderBy: { agentCode: "asc" },
    }),
  ]);

  const grouped = assignments.reduce<Record<string, typeof assignments>>((acc, a) => {
    (acc[a.pincode] ??= []).push(a);
    return acc;
  }, {});

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Area Routing</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Override the default nearest-agent dispatch for specific pincodes — a customer paying
          for dispatch inside an assigned pincode is routed only to the agents mapped here,
          instead of the usual radius search. Leave a pincode unassigned to keep the default
          radius-based behavior.
        </p>
      </div>

      {error && (
        <p className="mt-4 max-w-2xl rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_MESSAGES[error] ?? "Something went wrong. Try again."}
        </p>
      )}

      <div className="mt-6 max-w-lg rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-slate-900">Assign an agent to a pincode</h2>
        <form action={createAreaAssignmentAction} className="mt-3 space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700">Pincode</label>
            <input
              type="text"
              name="pincode"
              required
              placeholder="e.g. 560066"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Agent</label>
            <select
              name="agentId"
              required
              defaultValue=""
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="" disabled>
                Select an agent
              </option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.agentCode} · {agent.user.name}
                  {!agent.primeStatus ? " (not Prime — won't be dispatched yet)" : ""}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Assign
          </button>
        </form>
      </div>

      <div className="mt-8 max-w-2xl">
        <h2 className="text-lg font-semibold text-slate-900">
          Assigned pincodes ({Object.keys(grouped).length})
        </h2>

        {Object.keys(grouped).length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            No overrides yet — every dispatch uses plain radius search.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {Object.entries(grouped).map(([pincode, rows]) => (
              <div key={pincode} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="font-mono text-sm font-semibold text-slate-900">{pincode}</p>
                <ul className="mt-2 space-y-1">
                  {rows.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm"
                    >
                      <span>
                        {row.agent.agentCode} · {row.agent.user.name}
                        {row.agent.shopName ? ` (${row.agent.shopName})` : ""}
                      </span>
                      <form action={deleteAreaAssignmentAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <button
                          type="submit"
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
