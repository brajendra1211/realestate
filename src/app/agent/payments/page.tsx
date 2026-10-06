import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId, getAgentCommissionSummary } from "@/lib/agent";
import { getPayoutsForAgent } from "@/lib/payout";
import { prisma } from "@/lib/prisma";
import { formatINR } from "@/lib/format";
import { requestPayoutAction } from "../dashboard/actions";

type SearchParams = Promise<{
  tab?: string;
  saved?: string;
  error?: string;
}>;

const COMMISSION_LABELS: Record<string, string> = {
  UNLOCK_SPLIT: "Property Unlock Split (₹50)",
  GOLD_SPLIT: "Gold Direct Listing Split",
  DEAL_PROFIT_SHARE: "5-Stage Deal Profit Split",
  BROKERAGE: "Property Brokerage",
  REGISTRATION_REFERRAL: "Referral Partner Registration",
  AGENT_REFERRAL: "Sub-Partner Referral",
  CUSTOMER_PROPERTY_UPDATE: "Direct Property Update",
  REFERRAL_CUSTOMER_RENEWAL: "Partner Renewal Cut",
  COMPANY_FIVE_STAR_REWARD: "5-Star Rating Reward",
};

export default async function AgentPaymentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session || session.user.role !== "AGENT") redirect("/login");

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const { tab = "earnings", saved, error } = await searchParams;

  const [{ entries, totals }, payouts, propertyUnlocks, shopUnlocks] =
    await Promise.all([
      getAgentCommissionSummary(agent.id),
      getPayoutsForAgent(agent.id),
      prisma.propertyUnlock.findMany({
        where: { assignedAgentId: agent.id },
        include: {
          buyer: { select: { name: true, phone: true } },
          agentListing: { select: { title: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.agentShopUnlock.findMany({
        where: { agentId: agent.id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const totalEarned = Object.values(totals).reduce((a, b) => a + b, 0);
  const totalWithdrawn = payouts
    .filter((p) => p.status === "PAID")
    .reduce((a, p) => a + p.netAmount, 0);
  const totalPendingPayout = payouts
    .filter((p) => p.status === "PENDING")
    .reduce((a, p) => a + p.netAmount, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Earnings & Payment History
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track all incoming commission credits, property unlocks, and bank withdrawal requests.
          </p>
        </div>
        <Link
          href="/agent/dashboard"
          className="text-xs font-semibold text-blue-600 hover:text-blue-800"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Available Wallet Balance
          </span>
          <p className="mt-2 text-3xl font-black text-emerald-600">
            {formatINR(agent.walletBalance)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Ready for bank withdrawal</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Lifetime Earnings
          </span>
          <p className="mt-2 text-3xl font-black text-slate-900">
            {formatINR(totalEarned)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Total commissions credited</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Withdrawn
          </span>
          <p className="mt-2 text-3xl font-black text-slate-900">
            {formatINR(totalWithdrawn)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Processed to bank</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Pending Withdrawals
          </span>
          <p className="mt-2 text-3xl font-black text-amber-600">
            {formatINR(totalPendingPayout)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Awaiting admin transfer</p>
        </div>
      </div>

      {/* Request Payout Form Card */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Request Bank Withdrawal</h2>
            <p className="text-xs text-slate-500">
              TDS is deducted automatically per platform regulations before releasing to your registered bank account.
            </p>
          </div>
          {saved === "payout" && (
            <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              ✓ Withdrawal requested — pending admin transfer.
            </span>
          )}
          {error && (
            <span className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">
              ⚠ Withdrawal request error. Check balance or renewal status.
            </span>
          )}
        </div>

        <form action={requestPayoutAction} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-700">Amount (₹)</label>
            <input
              type="number"
              name="amount"
              min={100}
              max={agent.walletBalance}
              placeholder="e.g. 5000"
              required
              className="mt-1 w-44 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={agent.walletBalance < 100}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Withdraw Now
          </button>
          <span className="text-xs text-slate-400 pb-2">
            Min withdrawal: ₹100 · Wallet: {formatINR(agent.walletBalance)}
          </span>
        </form>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { key: "earnings", label: `Earnings & Credits (${entries.length})` },
          { key: "payouts", label: `Withdrawal History (${payouts.length})` },
          { key: "unlocks", label: `Property Unlocks (${propertyUnlocks.length})` },
          { key: "shop", label: `QR Shop Unlocks (${shopUnlocks.length})` },
        ].map((t) => {
          const active = tab === t.key;
          return (
            <Link
              key={t.key}
              href={`/agent/payments?tab=${t.key}`}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                active
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Tab 1: Earnings */}
        {tab === "earnings" && (
          <div>
            {entries.length === 0 ? (
              <p className="p-10 text-center text-sm text-slate-400">
                No commission credits recorded yet. Share listings or scan QR to start earning!
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 hover:bg-slate-50/60 transition gap-2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-bold text-sm">
                        +₹
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-sm">
                            {COMMISSION_LABELS[entry.type] ?? entry.type}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            {entry.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {entry.note || "Commission credit"}
                        </p>
                        {entry.refId && (
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Ref: {entry.refId}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right sm:self-center">
                      <p className="text-base font-black text-emerald-700">
                        +{formatINR(entry.amount)}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {entry.createdAt.toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Payouts */}
        {tab === "payouts" && (
          <div>
            {payouts.length === 0 ? (
              <p className="p-10 text-center text-sm text-slate-400">
                No withdrawal requests made yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {payouts.map((payout) => (
                  <div
                    key={payout.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 hover:bg-slate-50/60 transition gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          Withdrawal #{payout.id.slice(-6).toUpperCase()}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            payout.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : payout.status === "REJECTED"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {payout.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Gross: {formatINR(payout.grossAmount)} · TDS ({payout.tdsPercent}%):{" "}
                        {formatINR(payout.tdsAmount)} ·{" "}
                        <span className="font-semibold text-slate-800">
                          Net: {formatINR(payout.netAmount)}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Requested: {payout.requestedAt.toLocaleDateString("en-IN")}
                        {payout.processedAt && (
                          <span> · Processed: {payout.processedAt.toLocaleDateString("en-IN")}</span>
                        )}
                        {payout.paymentMode && <span> · Mode: {payout.paymentMode}</span>}
                      </p>
                    </div>

                    <div className="text-right sm:self-center">
                      <p className="text-base font-black text-slate-900">
                        {formatINR(payout.netAmount)}
                      </p>
                      <p className="text-[11px] text-slate-400">Net Disbursed</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Property Unlocks */}
        {tab === "unlocks" && (
          <div>
            {propertyUnlocks.length === 0 ? (
              <p className="p-10 text-center text-sm text-slate-400">
                No customer property unlocks on your listings yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {propertyUnlocks.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 hover:bg-slate-50/60 transition gap-2"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">
                        Listing: {u.agentListing.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Customer: {u.buyer.name || "Customer"} ({u.buyer.phone || "No phone"})
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Unlocked on: {u.createdAt.toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <div className="text-right sm:self-center">
                      <p className="text-base font-black text-emerald-700">
                        +{formatINR(u.agentSplit)}
                      </p>
                      <p className="text-[11px] text-slate-400">Your 50% split</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: QR Shop Unlocks */}
        {tab === "shop" && (
          <div>
            {shopUnlocks.length === 0 ? (
              <p className="p-10 text-center text-sm text-slate-400">
                No QR shop scans yet. Print your channel partner QR standee!
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {shopUnlocks.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 hover:bg-slate-50/60 transition gap-2"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">
                        Channel Partner QR Scan Unlock
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Customer Phone: {s.customerPhone || "Direct Customer"}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {s.createdAt.toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <div className="text-right sm:self-center">
                      <p className="text-base font-black text-purple-700">
                        +{formatINR(s.amount)}
                      </p>
                      <p className="text-[11px] text-slate-400">QR Unlock</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
