import Link from "next/link";
import { redirect } from "next/navigation";
import { BellRing, CheckCircle2, Clock, UserSearch } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AutoRefresh } from "@/components/AutoRefresh";
import { AdminPage, StatCard, Pill, EmptyState, btnGhost, btnPrimary, btnDanger, inputCls } from "@/components/admin/ui";
import { MAX_ACCEPTORS } from "@/lib/buyerInterest";
import { assignInterestAction, rebuzzInterestAction, closeInterestAction } from "./actions";

type SearchParams = Promise<{ status?: string }>;

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "OPEN", label: "Waiting for partner" },
  { key: "ACCEPTED", label: "Taken by partners" },
  { key: "CLOSED", label: "Closed" },
] as const;

const dt = (d: Date | null | undefined) => (d ? d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

export default async function AdminBuyerLeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { status } = await searchParams;
  const filter = FILTERS.some((f) => f.key === status) ? status! : "ALL";

  const [rows, counts, agents] = await Promise.all([
    prisma.buyerInterest.findMany({
      where: filter === "ALL" ? {} : { status: filter as "OPEN" | "ACCEPTED" | "CLOSED" },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { acceptances: { include: { agent: { select: { agentCode: true, user: { select: { name: true } } } } }, orderBy: { acceptedAt: "asc" } } },
    }),
    prisma.buyerInterest.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.agentProfile.findMany({
      where: { status: "APPROVED", primeStatus: true },
      select: { id: true, agentCode: true, city: true, user: { select: { name: true } } },
      orderBy: { agentCode: "asc" },
    }),
  ]);
  const buyers = await prisma.user.findMany({
    where: { id: { in: [...new Set(rows.map((r) => r.buyerId))] } },
    select: { id: true, name: true, phone: true },
  });
  const buyer = (id: string) => buyers.find((b) => b.id === id);
  const primaryIds = [...new Set(rows.map((r) => r.primaryAgentId).filter(Boolean))] as string[];
  const primaries = await prisma.agentProfile.findMany({ where: { id: { in: primaryIds } }, select: { id: true, agentCode: true } });
  const n = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;

  return (
    <AdminPage
      title="Buyer leads"
      description="Buyers who paid to unlock a property. The listing's partner is buzzed first, nearby partners 10 seconds later, then wider."
    >
      <AutoRefresh seconds={15} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Waiting for partner" value={n("OPEN")} hint={n("OPEN") ? "Needs attention" : "All picked up"} icon={BellRing} tone="amber" />
        <StatCard label="Accepted" value={n("ACCEPTED")} hint="A partner is on it" icon={CheckCircle2} tone="green" />
        <StatCard label="Total" value={n("OPEN") + n("ACCEPTED") + n("CLOSED")} icon={UserSearch} />
        <StatCard label="Closed" value={n("CLOSED")} icon={Clock} tone="violet" />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "ALL" ? "/admin/buyer-leads" : `/admin/buyer-leads?status=${f.key}`}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              filter === f.key ? "bg-ink text-white shadow" : "border border-slate-200 bg-white text-slate-600 hover:border-brand-600"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={UserSearch} title="No buyer leads yet" text="When a buyer pays to unlock a listing, it shows up here." />
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const b = buyer(r.buyerId);
            const primary = primaries.find((p) => p.id === r.primaryAgentId);
            return (
              <div key={r.id} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-ink">{b ? <Link href={`/admin/people/${b.id}`} className="hover:underline">{b.name}</Link> : "Buyer"}</p>
                    <p className="text-sm text-slate-500">
                      {b?.phone} · unlocked <b>{r.listingTitle}</b> ({[r.listingLocality, r.listingCity].filter(Boolean).join(", ")})
                    </p>
                  </div>
                  <Pill tone={r.status === "OPEN" ? "amber" : r.status === "ACCEPTED" ? "green" : "slate"}>
                    {r.status === "OPEN" ? "Waiting" : r.status === "ACCEPTED" ? "Accepted" : "Closed"}
                  </Pill>
                </div>
                <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Buyer paid</dt>
                    <dd className="font-semibold">{dt(r.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Listing partner</dt>
                    <dd className="font-semibold">{primary?.agentCode ?? "None (company listing)"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Accepted by ({r.acceptances.length}/{MAX_ACCEPTORS})</dt>
                    <dd className="font-semibold">
                      {r.acceptances.length ? r.acceptances.map((x) => `${x.agent.user.name} (${x.agent.agentCode})`).join(", ") : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">Times buzzed</dt>
                    <dd className="font-semibold">{r.buzzCount}</dd>
                  </div>
                </dl>

                {r.status !== "CLOSED" && (
                  <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
                    <form action={assignInterestAction} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={r.id} />
                      <select name="agentId" required defaultValue="" className={`${inputCls} !w-72`}>
                        <option value="" disabled>Assign to a partner…</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.user.name} ({a.agentCode}){a.city ? ` · ${a.city}` : ""}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className={btnPrimary}>Assign</button>
                    </form>
                    <form action={rebuzzInterestAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className={btnGhost}>
                        <BellRing className="h-4 w-4" /> Buzz all partners
                      </button>
                    </form>
                    <form action={closeInterestAction} className="ml-auto flex items-center gap-2">
                      <input type="hidden" name="id" value={r.id} />
                      <input name="note" placeholder="Reason (optional)" className={`${inputCls} !w-44`} />
                      <button type="submit" className={btnDanger}>Close</button>
                    </form>
                  </div>
                )}
                {r.adminNote && <p className="mt-2 text-xs text-slate-500">Note: {r.adminNote}</p>}
              </div>
            );
          })}
        </div>
      )}
    </AdminPage>
  );
}
