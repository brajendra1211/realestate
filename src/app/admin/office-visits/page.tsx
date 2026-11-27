import { redirect } from "next/navigation";
import { Building2, UserCheck, Users } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminPage, StatCard, Pill, EmptyState, Notice, btnPrimary, inputCls } from "@/components/admin/ui";
import { logOfficeVisitAction } from "./actions";
import { SmartInput } from "@/components/forms/FormKit";

type SearchParams = Promise<{ error?: string; saved?: string; q?: string }>;

const dt = (d: Date) => d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
const RELATIONS = [
  ["CLIENT", "Client"],
  ["INVESTOR", "Investor"],
  ["FRIEND", "Friend"],
  ["RELATIVE", "Relative"],
];
const INTERESTS = [
  ["BUY", "Property Buy"],
  ["INVESTMENT", "Investment"],
  ["GENERAL", "General inquiry"],
];

export default async function OfficeVisitsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUBADMIN")) redirect("/login");
  const { error, saved, q } = await searchParams;

  const query = q?.trim();
  const visits = await prisma.agentOfficeVisit.findMany({
    where: query ? { visitors: { some: { OR: [{ mobile: { contains: query } }, { name: { contains: query } }] } } } : {},
    orderBy: { visitedAt: "desc" },
    take: 100,
    include: { visitors: true },
  });
  const agentIds = [...new Set(visits.map((v) => v.agentId))];
  const agents = await prisma.agentProfile.findMany({
    where: { id: { in: agentIds } },
    select: { id: true, agentCode: true, user: { select: { name: true, phone: true } } },
  });
  const agentById = new Map(agents.map((a) => [a.id, a]));
  const [totalVisits, totalVisitors] = await Promise.all([
    prisma.agentOfficeVisit.count({ where: { visited: true } }),
    prisma.officeVisitor.count(),
  ]);

  return (
    <AdminPage
      title="Office visits & reception"
      description="Enter the agent code, mark the office visit, and attach the people who came with the agent. Everything is saved here as a verified database."
    >
      {error && <Notice tone="red">{error}</Notice>}
      {saved && <Notice tone="green">Visit saved.</Notice>}

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Office visits" value={totalVisits} icon={Building2} />
        <StatCard label="Visitors recorded" value={totalVisitors} icon={Users} tone="green" />
      </div>

      <form action={logOfficeVisitAction} className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-soft">
        <h2 className="text-lg font-bold text-ink">New visit</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <input name="agentCode" required placeholder="Agent code" className={inputCls} />
          <select name="visited" defaultValue="yes" className={inputCls}>
            <option value="yes">Office visit: Yes</option>
            <option value="no">Office visit: No</option>
          </select>
          <input type="datetime-local" name="visitedAt" className={inputCls} title="Leave empty for now" />
          <input name="notes" placeholder="Notes" className={inputCls} />
        </div>
        <p className="text-sm font-semibold text-slate-600">
          People who came with the agent (optional, up to 5). Date &amp; time is captured automatically.
        </p>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="grid gap-2 md:grid-cols-4">
            <input name={`vName${i}`} placeholder="Full name" className={inputCls} />
            <SmartInput kind="mobile" name={`vMobile${i}`} placeholder="Mobile number" inputMode="numeric" className={inputCls} />
            <select name={`vRelation${i}`} className={inputCls}>
              {RELATIONS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <select name={`vInterest${i}`} className={inputCls}>
              {INTERESTS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        ))}
        <button type="submit" className={btnPrimary}>
          Save visit
        </button>
      </form>

      <form className="flex gap-2">
        <input name="q" defaultValue={query} placeholder="Search visitor name / mobile" className={`${inputCls} !w-72`} />
        <button type="submit" className={btnPrimary}>
          Search
        </button>
      </form>

      {visits.length === 0 ? (
        <EmptyState icon={UserCheck} title="No visits yet" text="Saved office visits appear here." />
      ) : (
        <div className="space-y-3">
          {visits.map((v) => {
            const a = agentById.get(v.agentId);
            return (
              <div key={v.id} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-soft">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-ink">
                    {a?.user.name ?? "Agent"} · {a?.agentCode}
                  </p>
                  <Pill tone={v.visited ? "green" : "slate"}>{v.visited ? "Visited" : "Not visited"}</Pill>
                  <span className="text-xs text-slate-400">
                    {dt(v.visitedAt)}
                    {v.markedByName ? ` · by ${v.markedByName}` : ""}
                  </span>
                </div>
                {v.notes && <p className="mt-1 text-sm text-slate-600">{v.notes}</p>}
                {v.visitors.length > 0 && (
                  <ul className="mt-3 divide-y divide-slate-100 text-sm">
                    {v.visitors.map((p) => (
                      <li key={p.id} className="flex flex-wrap items-center gap-3 py-2">
                        <span className="font-semibold text-ink">{p.name}</span>
                        <a href={`tel:${p.mobile}`} className="text-brand-600">
                          {p.mobile}
                        </a>
                        <Pill tone="blue">{p.relation}</Pill>
                        <Pill tone="amber">{p.interest}</Pill>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminPage>
  );
}
