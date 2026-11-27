import { redirect } from "next/navigation";
import { BellRing, Eye, Send } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AdminPage, Pill, EmptyState, btnGhost, btnPrimary, inputCls } from "@/components/admin/ui";
import { buzzSelectedAction, buzzAreaAction, sendDirectAction } from "./actions";
import { SmartInput } from "@/components/forms/FormKit";

type SearchParams = Promise<{ ok?: string; err?: string; phone?: string }>;

const dt = (d: Date) => d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
const last5 = (p: string) => p.replace(/\D/g, "").slice(-5);

export default async function BuzzerControlPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUBADMIN")) redirect("/login");

  const { ok, err, phone } = await searchParams;
  const digits = (phone ?? "").replace(/\D/g, "").slice(-10);

  const [interests, agents, visits] = await Promise.all([
    prisma.buyerInterest.findMany({
      where: { status: { in: ["OPEN", "ACCEPTED"] } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.agentProfile.findMany({
      where: { status: "APPROVED", primeStatus: true },
      select: { id: true, agentCode: true, city: true, user: { select: { name: true } } },
      orderBy: { agentCode: "asc" },
    }),
    digits.length >= 5
      ? prisma.propertyVisitLog.findMany({
          where: { customerPhone: { endsWith: digits } },
          include: {
            agent: { select: { agentCode: true } },
            masterProperty: { select: { masterId: true, city: true, locality: true } },
          },
          orderBy: { visitedAt: "desc" },
          take: 100,
        })
      : Promise.resolve([]),
  ]);

  return (
    <AdminPage
      title="Buzzer & direct leads"
      description="Choose exactly which partners get a buzz, buzz by area/pincode, or hand a lead straight to a partner without ringing the buzzer."
    >
      {ok && <p className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">{ok}</p>}
      {err && <p className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">{err}</p>}

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-ink">Open buyer leads</h2>
        {interests.length === 0 ? (
          <EmptyState icon={BellRing} title="No open leads" text="New buyer leads appear here." />
        ) : (
          interests.map((r) => (
            <div key={r.id} className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-ink">{r.listingTitle}</p>
                  <p className="text-sm text-slate-500">
                    {[r.listingLocality, r.listingCity].filter(Boolean).join(", ")} · buzzed {r.buzzCount}×
                  </p>
                </div>
                <Pill tone={r.status === "OPEN" ? "amber" : "green"}>{r.status === "OPEN" ? "Waiting" : "Accepted"}</Pill>
              </div>

              {/* 1. Buzz only selected partners */}
              <form action={buzzSelectedAction} className="space-y-2">
                <input type="hidden" name="id" value={r.id} />
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Buzz selected partners only</p>
                <select name="agentIds" multiple size={5} className={`${inputCls} !h-auto`}>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.user.name} ({a.agentCode}){a.city ? ` · ${a.city}` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400">Ctrl/Cmd + click to select several.</p>
                <button type="submit" className={btnPrimary}>
                  <BellRing className="h-4 w-4" /> Buzz selected
                </button>
              </form>

              <div className="flex flex-wrap items-end gap-4 border-t border-slate-100 pt-4">
                {/* 2. Buzz by area */}
                <form action={buzzAreaAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <input name="pincode" placeholder="Pincode (area agents)" className={`${inputCls} !w-48`} />
                  <button type="submit" className={btnGhost}>Buzz area agents</button>
                </form>

                {/* 3. Direct send, no buzzer */}
                <form action={sendDirectAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <select name="agentId" required defaultValue="" className={`${inputCls} !w-64`}>
                    <option value="" disabled>Send directly to…</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.user.name} ({a.agentCode})
                      </option>
                    ))}
                  </select>
                  <button type="submit" className={btnGhost}>
                    <Send className="h-4 w-4" /> Send lead
                  </button>
                </form>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-ink">Customer visit history</h2>
        <form method="get" className="flex items-center gap-2">
          <SmartInput kind="mobile" name="phone" defaultValue={phone ?? ""} placeholder="Customer mobile number" className={`${inputCls} !w-64`} />
          <button type="submit" className={btnGhost}>
            <Eye className="h-4 w-4" /> Look up
          </button>
        </form>
        {digits.length >= 5 &&
          (visits.length === 0 ? (
            <p className="text-sm text-slate-500">No visits logged for this number.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="p-3">Customer (last 5)</th>
                    <th className="p-3">Property code</th>
                    <th className="p-3">Area</th>
                    <th className="p-3">Agent code</th>
                    <th className="p-3">Visited</th>
                    <th className="p-3">Conflict</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((v) => (
                    <tr key={v.id} className="border-t border-slate-100">
                      <td className="p-3 font-mono">•••••{last5(v.customerPhone)}</td>
                      <td className="p-3 font-mono">{v.masterProperty.masterId}</td>
                      <td className="p-3">{[v.masterProperty.locality, v.masterProperty.city].filter(Boolean).join(", ")}</td>
                      <td className="p-3 font-mono">{v.agent.agentCode}</td>
                      <td className="p-3">{dt(v.visitedAt)}</td>
                      <td className="p-3">{v.conflictWithAgentId ? <Pill tone="amber">Duplicate</Pill> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </section>
    </AdminPage>
  );
}
