import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/format";
import { getSiteSettings } from "@/lib/site-settings";
import { parseTypes } from "@/lib/commissionMode";
import { setCommissionModeAction, creditCommissionManuallyAction } from "./actions";
import { getAdminCommissionLedger } from "@/lib/deal";
import type { CommissionType } from "@/generated/prisma";
import { IndianRupee, Wallet, Handshake, Layers, Search as SearchIcon, X, ReceiptText } from "lucide-react";
import { Notice, StatCard, EmptyState, btnGhost, btnPrimary, inputCls } from "@/components/admin/ui";

type SearchParams = Promise<Record<string, string | undefined>>;

const COMMISSION_TYPE_META: Record<string, { label: string; badge: string }> = {
  BROKERAGE: { label: "Deal brokerage", badge: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  UNLOCK_SPLIT: { label: "Contact unlock split", badge: "bg-blue-50 text-blue-800 border-blue-200" },
  GOLD_SPLIT: { label: "Gold listing split", badge: "bg-amber-50 text-amber-800 border-amber-200" },
  DEAL_PROFIT_SHARE: { label: "Investor deal profit", badge: "bg-purple-50 text-purple-800 border-purple-200" },
  REGISTRATION_REFERRAL: { label: "Investor joining referral", badge: "bg-indigo-50 text-indigo-800 border-indigo-200" },
  AGENT_REFERRAL: { label: "Partner referral", badge: "bg-teal-50 text-teal-800 border-teal-200" },
  CUSTOMER_PROPERTY_UPDATE: { label: "Property update split", badge: "bg-cyan-50 text-cyan-800 border-cyan-200" },
  REFERRAL_CUSTOMER_RENEWAL: { label: "Renewal royalty", badge: "bg-sky-50 text-sky-800 border-sky-200" },
  COMPANY_FIVE_STAR_REWARD: { label: "5-star rating reward", badge: "bg-yellow-50 text-yellow-800 border-yellow-200" },
};

export async function CommissionsTab({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { agentId, type, saved, error } = await searchParams;
  const validCommissionType = type && type in COMMISSION_TYPE_META ? (type as CommissionType) : undefined;

  const [ledgerData, agents, st] = await Promise.all([
    getAdminCommissionLedger({ agentId: agentId || undefined, type: validCommissionType, take: 200 }),
    prisma.agentProfile.findMany({
      include: { user: { select: { name: true, phone: true } } },
      orderBy: { agentCode: "asc" },
    }),
    getSiteSettings(),
  ]);

  const manualSet = parseTypes(st.manualCommissionTypes);
  const { entries, totalCount, totalsByType, grandTotal, totalWallets } = ledgerData;
  const brokerageTotal = totalsByType.find((t) => t.type === "BROKERAGE")?._sum.amount ?? 0;
  const referralAndSplitsTotal = grandTotal - brokerageTotal;
  const selectedAgent = agentId ? agents.find((a) => a.id === agentId) : undefined;

  const streamLink = (key?: string) => {
    const p = new URLSearchParams({ tab: "commissions" });
    if (agentId) p.set("agentId", agentId);
    if (key) p.set("type", key);
    const qs = p.toString();
    return `/admin/partners?${qs}`;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total credited" value={formatINR(grandTotal)} hint={`${totalCount} transactions`} icon={IndianRupee} />
        <StatCard label="Wallet balance owed" value={formatINR(totalWallets)} hint="Not yet withdrawn" icon={Wallet} tone="green" />
        <StatCard label="Deal brokerage" value={formatINR(brokerageTotal)} hint="From sales & rentals" icon={Handshake} tone="amber" />
        <StatCard label="Referrals & splits" value={formatINR(referralAndSplitsTotal)} hint="Unlocks, gold, investors" icon={Layers} tone="violet" />
      </div>

      {saved === "manual" && <Notice tone="green">Commission credited to the partner wallet.</Notice>}
      {error === "manual" && <Notice tone="amber">Pick a partner, a type and an amount above 0.</Notice>}

      {/* Rate card: what each commission type pays today (live from Website settings) */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-soft">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-ink">Commission rates — who earns what</h2>
            <p className="text-xs text-slate-500">Live values. Change them in Website settings.</p>
          </div>
          <Link href="/admin/settings" className={btnGhost}>Edit rates</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[
            { k: "BROKERAGE", rate: `${st.brokeragePercent}%`, rule: `${st.brokeragePercent}% of deal value, from each side of a sale or rental` },
            { k: "UNLOCK_SPLIT", rate: `${st.unlockAgentSplitPercent}%`, rule: `${st.unlockAgentSplitPercent}% of the ${formatINR(st.unlockPassAmount)} contact unlock fee` },
            { k: "GOLD_SPLIT", rate: `${st.goldAgentSplitPercent}%`, rule: `${st.goldAgentSplitPercent}% of the ${formatINR(st.goldListingAmount)} Gold listing fee` },
            { k: "AGENT_REFERRAL", rate: `${st.agentReferralPercent}%`, rule: `${st.agentReferralPercent}% of a referred partner's first Prime payment` },
            { k: "REGISTRATION_REFERRAL", rate: `${st.investorReferralPercent}%`, rule: `${st.investorReferralPercent}% of the ${formatINR(st.investorRegistrationFee)} investor joining fee` },
            { k: "DEAL_PROFIT_SHARE", rate: `${st.profitAgentSharePercent}%`, rule: `${st.profitAgentSharePercent}% of deal profit to the referring partner (investor gets ${st.profitInvestorSharePercent}%)` },
            { k: "REFERRAL_CUSTOMER_RENEWAL", rate: `${st.listingSplitPercent}%`, rule: `${st.listingSplitPercent}% of a referred customer's listing renewal fee (${formatINR(st.basicListingFee)} Basic / ${formatINR(st.goldListingFee)} Gold)` },
            { k: "CUSTOMER_PROPERTY_UPDATE", rate: "—", rule: "No automatic payout is set up for this type yet" },
            { k: "COMPANY_FIVE_STAR_REWARD", rate: "—", rule: "No automatic payout is set up for this type yet" },
          ].map((r) => {
            const meta = COMMISSION_TYPE_META[r.k];
            const sum = totalsByType.find((t) => t.type === r.k)?._sum.amount ?? 0;
            return (
              <div key={r.k} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5">
                <span className={`mt-0.5 shrink-0 rounded-lg border px-2.5 py-1 text-sm font-black ${meta.badge}`}>{r.rate}</span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink">{meta.label}</p>
                  <p className="text-xs leading-snug text-slate-500">{r.rule}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">Paid so far: {formatINR(sum)}</p>
                  <form action={setCommissionModeAction} className="mt-2 inline-flex overflow-hidden rounded-lg border border-slate-200 text-[11px] font-bold">
                    <input type="hidden" name="type" value={r.k} />
                    <button
                      name="mode"
                      value="AUTO"
                      className={`cursor-pointer px-2.5 py-1 ${!manualSet.has(r.k) ? "bg-emerald-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                    >
                      Auto
                    </button>
                    <button
                      name="mode"
                      value="MANUAL"
                      className={`cursor-pointer px-2.5 py-1 ${manualSet.has(r.k) ? "bg-amber-500 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                    >
                      Manual
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          <b>Auto</b> = the system credits the wallet by itself. <b>Manual</b> = nothing is credited automatically; you enter it
          below under &quot;Credit manually&quot;. You can also switch types per partner from the Partners tab.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          TDS of {st.tdsPercent}% is deducted when a partner withdraws from their wallet.
        </p>
      </div>

      {/* Manual credit */}
      <form action={creditCommissionManuallyAction} className="rounded-3xl border border-amber-200 bg-amber-50/40 p-5 shadow-soft">
        <h2 className="text-base font-bold text-ink">Credit manually</h2>
        <p className="mb-4 text-xs text-slate-500">Pick the partner and the commission type, enter the amount. It goes straight to their wallet and the ledger.</p>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1.2fr_0.8fr_1.4fr_auto] xl:items-end">
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Channel partner</label>
            <select name="agentId" defaultValue={agentId ?? ""} required className={inputCls}>
              <option value="" disabled>Select partner…</option>
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.user.name} ({ag.agentCode ?? "no code"})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Commission type</label>
            <select name="type" defaultValue={validCommissionType ?? "BROKERAGE"} className={inputCls}>
              {Object.entries(COMMISSION_TYPE_META).map(([key, meta]) => (
                <option key={key} value={key}>{meta.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Amount (₹)</label>
            <input name="amount" type="number" min={1} step={1} required placeholder="0" className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Note (optional)</label>
            <input name="note" placeholder="e.g. Deal at Sector 62" className={inputCls} />
          </div>
          <button type="submit" className={btnPrimary}>Credit to wallet</button>
        </div>
      </form>

      {/* Filters */}
      <div className="space-y-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-soft">
        <form method="GET" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="tab" value="commissions" />
          {type && <input type="hidden" name="type" value={type} />}
          <div className="flex-1">
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Channel partner</label>
            <select name="agentId" defaultValue={agentId ?? ""} className={inputCls}>
              <option value="">All channel partners ({agents.length})</option>
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.user.name} ({ag.agentCode ?? "no code"}){ag.shopName ? ` · ${ag.shopName}` : ""}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={btnPrimary}>
            <SearchIcon className="h-4 w-4" /> Apply
          </button>
          {(agentId || type) && (
            <Link href="/admin/partners?tab=commissions" className={btnGhost}>
              <X className="h-4 w-4" /> Reset
            </Link>
          )}
        </form>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">How it was earned</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={streamLink()}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                !type ? "bg-ink text-white shadow" : "border border-slate-200 text-slate-600 hover:border-brand-600 hover:text-brand-700"
              }`}
            >
              All
            </Link>
            {Object.entries(COMMISSION_TYPE_META).map(([key, meta]) => {
              const sum = totalsByType.find((t) => t.type === key)?._sum.amount ?? 0;
              return (
                <Link
                  key={key}
                  href={streamLink(key)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    type === key ? "bg-ink text-white shadow" : "border border-slate-200 text-slate-600 hover:border-brand-600 hover:text-brand-700"
                  }`}
                >
                  {meta.label}
                  {sum > 0 && <span className={`text-xs ${type === key ? "text-white/70" : "text-slate-400"}`}>{formatINR(sum)}</span>}
                </Link>
              );
            })}
          </div>
        </div>

        {selectedAgent && (
          <p className="rounded-xl bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-800">
            Showing only <b>{selectedAgent.user.name}</b>
            {selectedAgent.agentCode ? ` (${selectedAgent.agentCode})` : ""}
          </p>
        )}
      </div>

      {/* Ledger */}
      {entries.length === 0 ? (
        <EmptyState icon={ReceiptText} title="No commission entries" text="Nothing matches these filters yet." />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-ink">Transactions</h2>
            <span className="text-xs text-slate-400">{entries.length} shown · newest first</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Partner</th>
                  <th className="px-5 py-3">Earned from</th>
                  <th className="px-5 py-3">Details</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => {
                  const meta = COMMISSION_TYPE_META[entry.type] ?? {
                    label: entry.type,
                    badge: "bg-slate-50 text-slate-700 border-slate-200",
                  };
                  return (
                    <tr key={entry.id} className="transition hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="block font-semibold text-ink">
                          {entry.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                        <span className="text-xs text-slate-400">
                          {entry.createdAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="block font-bold text-ink">{entry.agent.user.name}</span>
                        <span className="text-xs text-slate-400">
                          {entry.agent.agentCode}
                          {entry.agent.shopName ? ` · ${entry.agent.shopName}` : ""}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className={`inline-block rounded-full border px-2.5 py-1 text-[11px] font-bold ${meta.badge}`}>{meta.label}</span>
                      </td>
                      <td className="max-w-sm px-5 py-4 text-slate-600">
                        <p className="line-clamp-2">{entry.note || "Commission credit"}</p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <span className="font-display text-lg font-semibold text-emerald-700">+{formatINR(entry.amount)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
