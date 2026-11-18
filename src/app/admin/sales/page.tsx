import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AutoRefresh } from "@/components/AutoRefresh";
import { AdminPage } from "@/components/admin/ui";
import { ChartCard, HBars, Kpi, MultiLine, StackedColumns } from "@/components/charts/Charts";
import { STREAMS, formatINR, getSalesStats, getMonitorStats } from "@/lib/salesStats";
import { MonitorGrid } from "@/components/admin/MonitorGrid";

type SearchParams = Promise<{ days?: string }>;
const RANGES = [7, 30, 90];
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  TOKEN_RECEIVED: "Token received",
  AGREEMENT_DONE: "Agreement done",
  REGISTRY_COMPLETED: "Registry completed",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};
const STATUS_ORDER = ["ACTIVE", "TOKEN_RECEIVED", "AGREEMENT_DONE", "REGISTRY_COMPLETED", "CLOSED", "CANCELLED"];
// Ordinal blue ramp (light -> dark) for pipeline stages; cancelled stays neutral.
const STAGE_COLOR = ["#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#a8a7a0"];

export default async function AdminSalesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");
  const sp = await searchParams;
  const days = RANGES.includes(Number(sp.days)) ? Number(sp.days) : 30;

  const [s, monitor] = await Promise.all([getSalesStats(days), getMonitorStats()]);

  const streamSeries = STREAMS.map((st, i) => ({ name: st.name, color: `var(--viz-${i + 1})` }));
  const streamValues = STREAMS.map((st) => s.revenue[st.key]);
  const leadSeries = [
    { name: "Enquiries", color: "var(--viz-1)" },
    { name: "Property unlocks", color: "var(--viz-2)" },
    { name: "Requirements", color: "var(--viz-3)" },
  ];
  const dealsSorted = [...s.dealsByStatus].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));

  return (
    <AdminPage
      title="Sales & monitoring"
      description="Money collected, leads and deals over time, plus what needs attention right now."
      actions={
        <div className="flex gap-1.5">
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/admin/sales?days=${r}`}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                days === r ? "bg-ink text-white shadow" : "border border-slate-200 bg-white text-slate-600 hover:border-brand-600"
              }`}
            >
              {r} days
            </Link>
          ))}
        </div>
      }
    >
      <AutoRefresh seconds={60} />

      <MonitorGrid stats={monitor} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Money collected" value={formatINR(s.revenueTotal)} current={s.revenueTotal} prev={s.revenuePrev} spark={s.dailyRevenue} />
        <Kpi label="Leads" value={s.leadsTotal.toLocaleString("en-IN")} current={s.leadsTotal} prev={s.leadsPrev} spark={s.labels.map((_, i) => s.enquiries[i] + s.unlocks[i] + s.requirements[i])} />
        <Kpi label="Deals closed" value={String(s.dealsClosed)} current={s.dealsClosed} prev={s.dealsClosedPrev} />
        <Kpi label="New partners" value={String(s.newPartners)} current={s.newPartners} prev={s.newPartnersPrev} />
      </div>

      <ChartCard title="Money collected per day" subtitle={`Last ${days} days, by source`}>
        <StackedColumns labels={s.labels} series={streamSeries} values={streamValues} />
      </ChartCard>

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <ChartCard title="Leads per day" subtitle="Enquiries, buyer unlocks and requirements">
            <MultiLine labels={s.labels} series={leadSeries} values={[s.enquiries, s.unlocks, s.requirements]} />
          </ChartCard>
        </div>
        <div className="xl:col-span-2">
          <ChartCard title="Where the money came from" subtitle={`Last ${days} days`}>
            <HBars
              unit="inr"
              items={STREAMS.map((st, i) => ({ label: st.name, value: s.totals[st.key], color: `var(--viz-${i + 1})` })).sort((a, b) => b.value - a.value)}
            />
          </ChartCard>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Deal pipeline" subtitle="Number of deals at each stage (all time)">
          <HBars
            items={dealsSorted.map((d) => ({
              label: STATUS_LABEL[d.status] ?? d.status,
              sub: d.value ? formatINR(d.value) : undefined,
              value: d.count,
              color: STAGE_COLOR[STATUS_ORDER.indexOf(d.status)] ?? STAGE_COLOR[0],
            }))}
            empty="No deals yet."
          />
        </ChartCard>
        <ChartCard title="Top partners by commission" subtitle={`Earned in the last ${days} days`}>
          <HBars
            unit="inr"
            items={s.topPartners.map((p) => ({ label: p.name, sub: p.code ?? undefined, value: p.amount }))}
            empty="No commission credited in this period."
          />
        </ChartCard>
      </div>
    </AdminPage>
  );
}
