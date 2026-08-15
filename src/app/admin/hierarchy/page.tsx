import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/format";

// Master hierarchy map — §3.14 Admin Panel: Agent Code → Investor Code →
// Customer/Property Unit. The platform doesn't attach a Master Property ID
// to an investor deal cycle yet (that link is still Phase 4/5 work), so the
// leaf level here is each profit-distribution cycle — its customer
// transaction ref stands in for "which deal" until that link exists.
export default async function AdminHierarchyPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const agents = await prisma.agentProfile.findMany({
    where: { agentCode: { not: null } },
    select: {
      id: true,
      agentCode: true,
      user: { select: { name: true } },
      investors: {
        select: {
          id: true,
          investorCode: true,
          feeStatus: true,
          user: { select: { name: true } },
          profitDistributions: {
            select: { id: true, distributedAt: true, totalProfit: true, note: true },
            orderBy: { distributedAt: "desc" },
          },
        },
      },
    },
    orderBy: { agentCode: "asc" },
  });

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <h1 className="text-2xl font-bold text-slate-900">Master Hierarchy Map</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Agent Code → Investor Code → deal cycle, in one tree (§3.14). Only Prime agents
        (with an issued Agent Code) are shown.
      </p>

      <div className="mt-6 space-y-4">
        {agents.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            No Prime agents yet.
          </p>
        ) : (
          agents.map((agent) => (
            <div key={agent.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="font-mono font-semibold text-blue-700">
                {agent.agentCode} <span className="font-sans font-normal text-slate-500">— {agent.user.name}</span>
              </p>

              {agent.investors.length === 0 ? (
                <p className="mt-2 pl-4 text-sm text-slate-400">No linked investors.</p>
              ) : (
                <div className="mt-2 space-y-2 border-l-2 border-slate-100 pl-4">
                  {agent.investors.map((investor) => (
                    <div key={investor.id}>
                      <p className="font-mono text-sm font-semibold text-slate-800">
                        {investor.investorCode ?? "Pending code"}{" "}
                        <span className="font-sans font-normal text-slate-500">— {investor.user.name}</span>
                        {investor.feeStatus !== "PAID" && (
                          <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            Fee pending
                          </span>
                        )}
                      </p>

                      {investor.profitDistributions.length === 0 ? (
                        <p className="pl-4 text-xs text-slate-400">No deal cycles yet.</p>
                      ) : (
                        <ul className="mt-1 space-y-0.5 border-l-2 border-slate-50 pl-4">
                          {investor.profitDistributions.map((dist) => (
                            <li key={dist.id} className="text-xs text-slate-500">
                              {dist.distributedAt.toLocaleDateString("en-IN")} — {formatINR(dist.totalProfit)} profit
                              {dist.note ? ` · ${dist.note}` : ""}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
