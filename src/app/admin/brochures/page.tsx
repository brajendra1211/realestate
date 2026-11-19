import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminPage, EmptyState, btnPrimary, inputCls } from "@/components/admin/ui";
import { BROCHURE_PACK_CREDITS, BROCHURE_PACK_PRICE } from "@/lib/brochure";
import { grantCreditsAction } from "./actions";

type SearchParams = Promise<{ ok?: string; err?: string }>;

export default async function AdminBrochuresPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUBADMIN")) redirect("/login");
  const { ok, err } = await searchParams;

  const [agents, recharges, made] = await Promise.all([
    prisma.agentProfile.findMany({
      where: { status: "APPROVED" },
      select: {
        id: true, agentCode: true, brochureCredits: true,
        user: { select: { name: true } },
        _count: { select: { brochures: true } },
      },
      orderBy: { agentCode: "asc" },
    }),
    prisma.brochureRecharge.groupBy({ by: ["agentId"], where: { source: "PAID" }, _sum: { amount: true } }),
    prisma.brochure.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, title: true, createdAt: true, agent: { select: { agentCode: true, user: { select: { name: true } } } } },
    }),
  ]);
  const paid = new Map(recharges.map((r) => [r.agentId, r._sum.amount ?? 0]));
  const totalRevenue = [...paid.values()].reduce((a, b) => a + b, 0);
  const totalMade = agents.reduce((a, g) => a + g._count.brochures, 0);

  return (
    <AdminPage
      title="Brochure credits"
      description={`Partners ₹${BROCHURE_PACK_PRICE} mein ${BROCHURE_PACK_CREDITS} brochure banate hain. Yahan unke credits, kamai aur manual credit dene ka option hai.`}
    >
      {ok && <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">{ok}</p>}
      {err && <p className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{err}</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Brochure revenue", `₹${totalRevenue.toLocaleString("en-IN")}`],
          ["Brochures made", String(totalMade)],
          ["Partners with credits", String(agents.filter((a) => a.brochureCredits > 0).length)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{k}</p>
            <p className="mt-1 text-3xl font-black text-ink">{v}</p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-ink">Partners</h2>
        {agents.length === 0 ? (
          <EmptyState icon={FileText} title="No partners yet" text="Approved partners appear here." />
        ) : (
          <div className="divide-y divide-slate-100 rounded-3xl border border-slate-200/80 bg-white shadow-soft">
            {agents.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-bold text-ink">
                    {a.user.name} <span className="font-mono text-xs text-slate-500">{a.agentCode ?? "—"}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {a._count.brochures} made · ₹{(paid.get(a.id) ?? 0).toLocaleString("en-IN")} paid
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-black ${a.brochureCredits > 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {a.brochureCredits} credits
                  </span>
                  <form action={grantCreditsAction} className="flex items-center gap-2">
                    <input type="hidden" name="agentId" value={a.id} />
                    <input name="credits" type="number" min={1} max={1000} defaultValue={BROCHURE_PACK_CREDITS} className={`${inputCls} w-20`} />
                    <button type="submit" className={btnPrimary}>Give</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-ink">Recent brochures</h2>
        <div className="divide-y divide-slate-100 rounded-3xl border border-slate-200/80 bg-white text-sm shadow-soft">
          {made.length === 0 && <p className="p-4 text-slate-400">Abhi koi brochure nahi bani.</p>}
          {made.map((m) => (
            <div key={m.id} className="flex justify-between gap-3 p-3">
              <span className="truncate">{m.title}</span>
              <span className="shrink-0 text-xs text-slate-500">
                {m.agent.user.name} ({m.agent.agentCode ?? "—"}) · {m.createdAt.toLocaleDateString("en-IN")}
              </span>
            </div>
          ))}
        </div>
      </section>
    </AdminPage>
  );
}
