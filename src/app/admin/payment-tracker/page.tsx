import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeIndianRupee, CheckCircle2, Clock3, Search, TrendingUp } from "lucide-react";
import { auth } from "@/auth";
import { formatINR } from "@/lib/format";
import { getPaymentTracker, summarize, STREAMS, type PayRow, type StreamKey } from "@/lib/paymentTracker";
import { AdminPage, StatCard, EmptyState, inputCls } from "@/components/admin/ui";

type SearchParams = Promise<{ tab?: string; status?: string; q?: string }>;

const STATUS_CHIP = {
  PAID: { cls: "is-green", label: "✓ Paid" },
  UNPAID: { cls: "is-red", label: "✕ Not paid" },
  FREE: { cls: "is-violet", label: "Free credit" },
} as const;

const dateTime = (d: Date) => d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

function href(tab: string, status: string, q: string) {
  const p = new URLSearchParams();
  if (tab !== "partner") p.set("tab", tab);
  if (status !== "all") p.set("status", status);
  if (q) p.set("q", q);
  const s = p.toString();
  return `/admin/payment-tracker${s ? `?${s}` : ""}`;
}

export default async function PaymentTrackerPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const sp = await searchParams;
  const tab = (STREAMS.some((s) => s.key === sp.tab) ? sp.tab : "partner") as StreamKey;
  const status = sp.status === "paid" || sp.status === "unpaid" ? sp.status : "all";
  const q = (sp.q ?? "").trim();

  const data = await getPaymentTracker();
  const all = (Object.keys(data) as StreamKey[]).flatMap((k) => data[k]);
  const grand = summarize(all);

  const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const last30 = all.filter((r) => r.status === "PAID" && r.at.getTime() >= monthAgo).reduce((s, r) => s + r.amount, 0);

  let rows: PayRow[] = data[tab];
  if (status === "paid") rows = rows.filter((r) => r.status === "PAID");
  if (status === "unpaid") rows = rows.filter((r) => r.status === "UNPAID");
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter((r) => [r.who, r.contact, r.detail, r.ref].some((v) => v?.toLowerCase().includes(needle)));
  }
  const current = summarize(data[tab]);
  const streamMeta = STREAMS.find((s) => s.key === tab)!;

  return (
    <AdminPage
      title="Payment tracker"
      description="Every kind of payment in one place: who paid, who has not, and how. Click a name to open that person's full profile."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Collected (all time)" value={formatINR(grand.paidAmount)} hint={`${grand.paid} payments`} icon={BadgeIndianRupee} tone="green" />
        <StatCard label="Last 30 days" value={formatINR(last30)} hint="Paid only" icon={TrendingUp} tone="brand" />
        <StatCard label="Not paid yet" value={grand.unpaid} hint="People who still need to pay" icon={Clock3} tone="rose" />
        <StatCard label="Pending amount" value={formatINR(grand.unpaidAmount)} hint="Value waiting to be collected" icon={CheckCircle2} tone="amber" />
      </div>

      {/* One tab per payment type */}
      <div className="flex flex-wrap gap-2">
        {STREAMS.map((s) => {
          const sm = summarize(data[s.key]);
          const active = s.key === tab;
          return (
            <Link
              key={s.key}
              href={href(s.key, "all", "")}
              className={`rounded-2xl border px-4 py-2.5 text-sm transition ${
                active
                  ? "border-sky-500 bg-sky-50 text-ink shadow-[0_0_18px_rgba(0,200,255,0.4)]"
                  : "border-slate-200 bg-white text-slate-600 hover:border-sky-400"
              }`}
            >
              <span className="block font-bold">{s.label}</span>
              <span className="mt-0.5 flex items-center gap-2 text-[11px] font-semibold">
                <span className="neon-text-green">{sm.paid} paid</span>
                {sm.unpaid > 0 && <span className="text-rose-600">{sm.unpaid} unpaid</span>}
              </span>
            </Link>
          );
        })}
      </div>

      <section className="neon-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink">{streamMeta.label}</h2>
            <p className="text-sm text-slate-400">
              {streamMeta.hint} · {formatINR(current.paidAmount)} collected
              {current.unpaid > 0 && <> · <span className="text-rose-600">{formatINR(current.unpaidAmount)} pending</span></>}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["all", "paid", "unpaid"] as const).map((st) => (
              <Link
                key={st}
                href={href(tab, st, q)}
                className={`neon-chip ${status === st ? (st === "unpaid" ? "is-red" : st === "paid" ? "is-green" : "is-cyan") : "is-muted"}`}
              >
                {st === "all" ? "All" : st === "paid" ? "Paid" : "Not paid"}
              </Link>
            ))}
            <form action="/admin/payment-tracker" className="relative">
              {tab !== "partner" && <input type="hidden" name="tab" value={tab} />}
              {status !== "all" && <input type="hidden" name="status" value={status} />}
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input name="q" defaultValue={q} placeholder="Search name, phone, id…" className={`${inputCls} w-56 pl-9`} />
            </form>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="mt-5">
            <EmptyState icon={BadgeIndianRupee} title="Nothing here" text="No payments match this view." />
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-2xl border border-cyan-400/15">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Who</th>
                  <th className="px-4 py-3">For</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">How</th>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-400/10">
                {rows.map((r) => {
                  const chip = STATUS_CHIP[r.status];
                  return (
                    <tr key={r.id}>
                      <td className="px-4 py-3">
                        <span className={`neon-chip ${chip.cls}`}>{chip.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        {r.userId ? (
                          <Link href={`/admin/people/${r.userId}`} className="font-bold text-ink hover:text-sky-600">
                            {r.who}
                          </Link>
                        ) : (
                          <span className="font-bold text-ink">{r.who}</span>
                        )}
                        {r.contact && <p className="text-xs text-slate-400">{r.contact}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.detail ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-bold text-ink">{formatINR(r.amount)}</td>
                      <td className="px-4 py-3 text-slate-600">{r.method}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">{dateTime(r.at)}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-400">{r.ref ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminPage>
  );
}
