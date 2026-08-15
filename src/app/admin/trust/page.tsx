import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isTopRatedAgent } from "@/lib/rating";

export default async function AdminTrustPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const [warnings, complaints, conflicts, topAgents] = await Promise.all([
    prisma.agentWarning.findMany({
      include: { agent: { select: { agentCode: true, user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.customerAgentBlock.findMany({
      include: { agent: { select: { agentCode: true, user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.propertyVisitLog.findMany({
      where: { isPrimaryOwner: false },
      include: {
        agent: { select: { agentCode: true } },
        masterProperty: { select: { masterId: true } },
      },
      orderBy: { visitedAt: "desc" },
      take: 50,
    }),
    prisma.agentProfile.findMany({
      where: { primeStatus: true, ratingAvg: { not: null } },
      select: {
        agentCode: true,
        ratingAvg: true,
        warningCount: true,
        user: { select: { name: true } },
        _count: { select: { ratings: true } },
      },
      orderBy: { ratingAvg: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <h1 className="text-2xl font-bold text-slate-900">Trust & Retention</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Anti-poaching conflicts, formal complaints, 3-strike warnings, and agent ratings (§3.8/§3.9).
      </p>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Duplicate-visit conflicts</h2>
      <div className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {conflicts.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">No conflicts logged.</p>
        ) : (
          conflicts.map((c) => (
            <div key={c.id} className="px-4 py-3 text-sm">
              <p className="text-slate-800">
                {c.masterProperty.masterId} — {c.agent.agentCode} viewed after original agent
              </p>
              <p className="text-xs text-slate-400">{c.visitedAt.toLocaleString("en-IN")}</p>
            </div>
          ))
        )}
      </div>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Formal complaints</h2>
      <div className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {complaints.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">No complaints on file.</p>
        ) : (
          complaints.map((c) => (
            <div key={c.id} className="px-4 py-3 text-sm">
              <p className="text-slate-800">
                {c.agent.agentCode} ({c.agent.user.name}) — {c.reason}
              </p>
              <p className="text-xs text-slate-400">{c.createdAt.toLocaleString("en-IN")}</p>
            </div>
          ))
        )}
      </div>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Warnings issued</h2>
      <div className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {warnings.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">No warnings issued.</p>
        ) : (
          warnings.map((w) => (
            <div key={w.id} className="px-4 py-3 text-sm">
              <p className="text-slate-800">
                {w.agent.agentCode} ({w.agent.user.name}) — {w.reason}
              </p>
              <p className="text-xs text-slate-400">{w.createdAt.toLocaleString("en-IN")}</p>
            </div>
          ))
        )}
      </div>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Top rated agents</h2>
      <div className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {topAgents.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-400">No ratings yet.</p>
        ) : (
          topAgents.map((a) => (
            <div key={a.agentCode} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="text-slate-800">
                  {a.agentCode} ({a.user.name})
                  {isTopRatedAgent(a.ratingAvg, a._count.ratings) && (
                    <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      Top Rated
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-400">{a._count.ratings} ratings</p>
              </div>
              <span className="font-semibold text-slate-900">
                {(a.ratingAvg ?? 0).toFixed(1)} ★
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
