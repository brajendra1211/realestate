import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { approveAgentAction, rejectAgentAction, activatePrimeAction } from "./actions";

const DOC_LABELS: Record<string, string> = {
  RERA_CERTIFICATE: "RERA certificate",
  TRADE_LICENSE: "Trade license",
  GST_CERTIFICATE: "GST certificate",
  OTHER: "Document",
};

type SearchParams = Promise<{ status?: string; saved?: string; error?: string }>;

export default async function AdminAgentsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { status, saved, error } = await searchParams;
  const filterStatus = status === "APPROVED" || status === "REJECTED" ? status : "PENDING";

  const [agents, plans] = await Promise.all([
    prisma.agentProfile.findMany({
      where: { status: filterStatus },
      include: { user: true, documents: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.plan.findMany({ where: { active: true, role: { in: ["AGENT", "BOTH"] } }, orderBy: { price: "asc" } }),
  ]);

  const filterLink = (value: string) => `/admin/agents?status=${value}`;

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <h1 className="text-2xl font-bold text-slate-900">Agents</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Verify submitted profiles, then activate a Prime plan to issue the Agent Code.
      </p>

      {saved === "1" && (
        <p className="mt-4 max-w-2xl rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Saved.</p>
      )}
      {error && (
        <p className="mt-4 max-w-2xl rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error === "plan" ? "Select a plan to activate Prime." : `Could not complete action: ${error}`}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        {["PENDING", "APPROVED", "REJECTED"].map((value) => (
          <a
            key={value}
            href={filterLink(value)}
            className={`rounded-full border px-3 py-1.5 font-medium ${
              filterStatus === value
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {value.charAt(0) + value.slice(1).toLowerCase()}
          </a>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {agents.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            No agents in this status.
          </p>
        ) : (
          agents.map((agent) => (
            <div key={agent.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-900">{agent.shopName ?? agent.user.name}</p>
                {agent.agentCode && (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 font-mono text-xs font-semibold text-blue-700">
                    {agent.agentCode}
                  </span>
                )}
                {agent.primeStatus && (
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                    Prime active
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500">
                {agent.user.name} · {agent.user.email} {agent.user.phone ? `· ${agent.user.phone}` : ""}
              </p>
              <p className="text-xs text-slate-400">
                {agent.city ?? "—"} · {agent.shopAddress ?? "No address given"}
              </p>
              <p className="text-xs text-slate-400">
                RERA: {agent.reraNumber ?? "—"} · GST: {agent.gstNumber ?? "—"} · Experience:{" "}
                {agent.yearsExperience ?? "—"} yrs · Staff: {agent.staffCount ?? "—"}
              </p>

              {agent.documents.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {agent.documents.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                    >
                      {DOC_LABELS[doc.type]}
                    </a>
                  ))}
                </div>
              )}

              {agent.status === "REJECTED" && agent.rejectionReason && (
                <p className="mt-2 text-xs font-medium text-red-600">Reason: {agent.rejectionReason}</p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {agent.status === "PENDING" && (
                  <>
                    <form action={approveAgentAction}>
                      <input type="hidden" name="id" value={agent.id} />
                      <button
                        type="submit"
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                      >
                        Approve
                      </button>
                    </form>
                    <form action={rejectAgentAction} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={agent.id} />
                      <input
                        type="text"
                        name="reason"
                        required
                        placeholder="Rejection reason"
                        className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Reject
                      </button>
                    </form>
                  </>
                )}
                {agent.status === "APPROVED" && !agent.primeStatus && (
                  <form action={activatePrimeAction} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={agent.id} />
                    <select
                      name="planId"
                      required
                      defaultValue=""
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                    >
                      <option value="" disabled>
                        Select Prime plan…
                      </option>
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} (₹{plan.price.toLocaleString("en-IN")})
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Activate Prime
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
