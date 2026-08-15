import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getInvestorByUserId, getInvestorLedger } from "@/lib/investor";
import { LogoutButton } from "@/components/LogoutButton";
import { formatINR, PAYMENT_MODE_LABELS } from "@/lib/format";

export default async function InvestorDashboardPage() {
  const session = await auth();
  if (!session) redirect("/investor/login");
  if (session.user.role !== "INVESTOR") redirect("/login");

  const investor = await getInvestorByUserId(session.user.id);
  if (!investor) redirect("/investor/login");

  const { entries, distributions, totalProfit } = await getInvestorLedger(investor.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Investor Portal</h1>
          <p className="mt-1 text-sm text-slate-500">
            {investor.investorCode
              ? `Investor Code ${investor.investorCode}`
              : "Registration fee pending — contact your agent."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/investor/documents" className="text-sm font-medium text-blue-600 hover:underline">
            Document Vault
          </a>
          <LogoutButton className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Active investment capital
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatINR(investor.totalInvested)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total profit credited</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatINR(totalProfit)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Referring agent</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {investor.referringAgent.agentCode ?? investor.referringAgent.shopName ?? "—"}
          </p>
        </div>
      </div>

      {investor.expiresAt && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Registration valid until {investor.expiresAt.toLocaleDateString("en-IN")}.
        </p>
      )}

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Date-wise profit ledger</h2>
      <div className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {entries.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">No profit credited yet.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="text-slate-600">{entry.note}</p>
                <p className="text-xs text-slate-400">
                  {entry.createdAt.toLocaleDateString("en-IN")}
                  {entry.customerTransactionRef && ` · Txn ${entry.customerTransactionRef}`}
                  {entry.holdDurationDays != null && ` · held ${entry.holdDurationDays} days`}
                </p>
              </div>
              <span className="font-semibold text-slate-900">{formatINR(entry.amount)}</span>
            </div>
          ))
        )}
      </div>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Deal profit distributions</h2>
      <p className="mt-1 text-sm text-slate-500">
        Full split for each deal cycle — your 40% share plus the agent/expense/company lines for
        transparency.
      </p>
      <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Total profit</th>
              <th className="px-4 py-2">Your share (40%)</th>
              <th className="px-4 py-2">Payment mode</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {distributions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  No deal cycles yet.
                </td>
              </tr>
            ) : (
              distributions.map((dist) => (
                <tr key={dist.id}>
                  <td className="px-4 py-2 text-slate-500">
                    {dist.distributedAt.toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-2">{formatINR(dist.totalProfit)}</td>
                  <td className="px-4 py-2 font-semibold text-slate-900">
                    {formatINR(dist.investorShare)}
                  </td>
                  <td className="px-4 py-2 text-slate-500">{PAYMENT_MODE_LABELS[dist.paymentMode]}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
