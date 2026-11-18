import Link from "next/link";
import { redirect } from "next/navigation";
import { AlarmClock, CheckCircle2, LifeBuoy } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AutoRefresh } from "@/components/AutoRefresh";
import { AdminPage, StatCard, Pill, EmptyState, btnPrimary, btnGhost, inputCls } from "@/components/admin/ui";
import { resolveTicketAction } from "./actions";

type SearchParams = Promise<{ f?: string }>;

const CATEGORY_LABEL: Record<string, string> = {
  COMMISSION_CONFLICT: "Commission conflict",
  CUSTOMER_COMPLAINT: "Customer complaint",
  WEBSITE_FEEDBACK: "Website feedback",
};
const FILTERS = [
  { key: "OPEN", label: "Pending" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "ALL", label: "All" },
] as const;

const dt = (d: Date) => d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default async function AdminSupportPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUBADMIN")) redirect("/login");
  const { f } = await searchParams;
  const filter = FILTERS.some((x) => x.key === f) ? f! : "OPEN";

  const now = new Date();
  const [rows, overdue, pending, resolved] = await Promise.all([
    prisma.supportTicket.findMany({
      where: filter === "ALL" ? {} : filter === "RESOLVED" ? { status: "RESOLVED" } : { status: { not: "RESOLVED" } },
      orderBy: [{ dueAt: "asc" }],
      take: 100,
    }),
    prisma.supportTicket.count({ where: { status: { not: "RESOLVED" }, dueAt: { lt: now } } }),
    prisma.supportTicket.count({ where: { status: { not: "RESOLVED" } } }),
    prisma.supportTicket.count({ where: { status: "RESOLVED" } }),
  ]);
  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(rows.map((r) => r.userId))] } },
    select: { id: true, name: true, phone: true },
  });
  const userOf = (id: string) => users.find((u) => u.id === id);

  return (
    <AdminPage title="Support & disputes" description="Commission conflicts and complaints. Each one must be audited and resolved within 2 hours.">
      <AutoRefresh seconds={30} />
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Pending" value={pending} icon={LifeBuoy} tone="amber" />
        <StatCard label="Past 2-hour SLA" value={overdue} hint={overdue ? "Resolve now" : "On time"} icon={AlarmClock} tone="rose" />
        <StatCard label="Resolved" value={resolved} icon={CheckCircle2} tone="green" />
      </div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((x) => (
          <Link
            key={x.key}
            href={`/admin/support?f=${x.key}`}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              filter === x.key ? "bg-ink text-white shadow" : "border border-slate-200 bg-white text-slate-600 hover:border-brand-600"
            }`}
          >
            {x.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={LifeBuoy} title="Nothing here" text="New requests from partners and customers appear here." />
      ) : (
        <div className="space-y-4">
          {rows.map((t) => {
            const u = userOf(t.userId);
            const late = t.status !== "RESOLVED" && t.dueAt < now;
            return (
              <div key={t.id} className={`rounded-3xl border bg-white p-5 shadow-soft ${late ? "border-red-300" : "border-slate-200/80"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-ink">{t.subject}</p>
                    <p className="text-sm text-slate-500">
                      <Pill tone="slate">{CATEGORY_LABEL[t.category]}</Pill>{" "}
                      {u ? (
                        <Link href={`/admin/people/${u.id}`} className="font-semibold hover:underline">
                          {u.name}
                        </Link>
                      ) : (
                        "User"
                      )}{" "}
                      ({t.role}) {u?.phone ? `· ${u.phone}` : ""}
                    </p>
                    <p className="text-xs text-slate-400">
                      Raised {dt(t.createdAt)} · due {dt(t.dueAt)}
                    </p>
                  </div>
                  <Pill tone={t.status === "RESOLVED" ? "green" : late ? "red" : "amber"}>
                    {t.status === "RESOLVED" ? "Resolved" : late ? "Overdue" : t.status === "IN_REVIEW" ? "In review" : "Open"}
                  </Pill>
                </div>
                <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{t.message}</p>
                {t.status !== "RESOLVED" ? (
                  <form action={resolveTicketAction} className="mt-4 flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={t.id} />
                    <input name="resolution" placeholder="Resolution / audit note" defaultValue={t.resolution ?? ""} className={`${inputCls} !w-80 flex-1`} />
                    <button type="submit" name="status" value="IN_REVIEW" className={btnGhost}>
                      Mark in review
                    </button>
                    <button type="submit" name="status" value="RESOLVED" className={btnPrimary}>
                      Resolve
                    </button>
                  </form>
                ) : (
                  t.resolution && <p className="mt-3 text-sm text-emerald-800">Resolution: {t.resolution}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminPage>
  );
}
