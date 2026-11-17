import Link from "next/link";
import { CheckCircle2, Clock, Wallet, XCircle, Landmark, Percent } from "lucide-react";
import { getPendingPayouts } from "@/lib/payout";
import { getSiteSettings } from "@/lib/site-settings";
import { formatINR, PAYMENT_MODES, PAYMENT_MODE_LABELS } from "@/lib/format";
import { processPayoutAction, rejectPayoutAction } from "../payouts/actions";
import { StatCard, EmptyState, Notice, btnSuccess, btnDanger, inputCls } from "@/components/admin/ui";

type SearchParams = Promise<Record<string, string | undefined>>;

export async function PayoutsTab({ searchParams }: { searchParams: SearchParams }) {
  const { saved } = await searchParams;
  const [payouts, settings] = await Promise.all([
    getPendingPayouts(),
    getSiteSettings(),
  ]);

  const grossTotal = payouts.reduce((n, p) => n + p.grossAmount, 0);
  const tdsTotal = payouts.reduce((n, p) => n + p.tdsAmount, 0);
  const netTotal = payouts.reduce((n, p) => n + p.netAmount, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Waiting" value={payouts.length} hint="Requests to process" icon={Clock} tone="amber" />
        <StatCard label="Gross requested" value={formatINR(grossTotal)} icon={Wallet} />
        <StatCard label={`TDS withheld (${settings.tdsPercent}%)`} value={formatINR(tdsTotal)} hint="Deducted automatically" icon={Percent} tone="violet" />
        <StatCard label="Net to transfer" value={formatINR(netTotal)} hint="What you pay out" icon={Landmark} tone="green" />
      </div>

      {saved === "paid" && <Notice tone="green">Payout marked as paid.</Notice>}
      {saved === "rejected" && <Notice tone="amber">Payout rejected — the amount went back to the partner wallet.</Notice>}

      <p className="text-xs text-slate-500">
        TDS rate is edited in{" "}
        <Link href="/admin/settings" className="font-semibold text-brand-600 hover:underline">
          Website settings → Payments
        </Link>
        .
      </p>

      {payouts.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No pending payouts" text="You are all caught up. New requests will show up here." />
      ) : (
        <div className="space-y-4">
          {payouts.map((payout) => (
            <div
              key={payout.id}
              className="flex flex-col gap-5 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-soft lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-400 text-lg font-bold text-white">
                  {payout.agent.user.name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <p className="font-bold text-ink">{payout.agent.user.name}</p>
                  <p className="text-xs text-slate-500">
                    {payout.agent.agentCode} · requested {payout.requestedAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 text-center lg:text-left">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross</p>
                  <p className="mt-0.5 font-semibold text-ink">{formatINR(payout.grossAmount)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">TDS {payout.tdsPercent}%</p>
                  <p className="mt-0.5 font-semibold text-rose-600">−{formatINR(payout.tdsAmount)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pay this</p>
                  <p className="font-display mt-0.5 text-xl font-semibold text-emerald-700">{formatINR(payout.netAmount)}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <form action={processPayoutAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={payout.id} />
                  <select name="paymentMode" defaultValue="BANK_TRANSFER" className={`${inputCls} w-auto`}>
                    {PAYMENT_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {PAYMENT_MODE_LABELS[mode]}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className={btnSuccess}>
                    <CheckCircle2 className="h-4 w-4" /> Mark paid
                  </button>
                </form>
                <form action={rejectPayoutAction}>
                  <input type="hidden" name="id" value={payout.id} />
                  <button type="submit" className={btnDanger}>
                    <XCircle className="h-4 w-4" /> Reject
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
