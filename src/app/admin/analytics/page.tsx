import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getFinancialAnalytics } from "@/lib/analytics";
import { formatINR } from "@/lib/format";

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export default async function AdminAnalyticsPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const analytics = await getFinancialAnalytics();

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <h1 className="text-2xl font-bold text-slate-900">Financial Analytics</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Net profit, investor returns, agent payouts, and operating expenses — §3.14. Company
        revenue counts only money that&apos;s actually the company&apos;s (profit-distribution
        company share, unlock-pass company split, non-referral part of investor registration
        fees); agent commissions were never company money, so agent payouts are shown
        separately, not subtracted from net profit.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Net profit" value={formatINR(analytics.netProfit)} />
        <StatCard label="Total investor returns" value={formatINR(analytics.totalInvestorReturns)} />
        <StatCard
          label="Total agent payouts (paid)"
          value={formatINR(analytics.totalAgentPayouts)}
          hint={`₹${analytics.totalTdsCollected.toLocaleString("en-IN")} TDS collected on these`}
        />
        <StatCard label="Operating expenses" value={formatINR(analytics.operatingExpense)} />
      </div>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Company revenue breakdown</h2>
      <div className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-slate-600">Investor deal profit share (40%)</span>
          <span className="font-semibold text-slate-900">
            {formatINR(analytics.breakdown.profitDistributionCompanyRevenue)}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-slate-600">Customer unlock pass split (50%)</span>
          <span className="font-semibold text-slate-900">
            {formatINR(analytics.breakdown.unlockCompanyRevenue)}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-slate-600">Investor registration fee (90%, non-referral)</span>
          <span className="font-semibold text-slate-900">
            {formatINR(analytics.breakdown.investorRegistrationCompanyRevenue)}
          </span>
        </div>
        <div className="flex items-center justify-between bg-slate-50 px-4 py-3 text-sm">
          <span className="font-semibold text-slate-700">Total company revenue</span>
          <span className="font-bold text-slate-900">{formatINR(analytics.companyRevenue)}</span>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        ₹{analytics.totalDealProfitCycled.toLocaleString("en-IN")} total deal profit has been
        cycled through the Master Commission Calculator so far.
      </p>
    </div>
  );
}
