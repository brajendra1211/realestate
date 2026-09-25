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
          <h1 className="text-2xl font-bold text-slate-900">Referral Partner Portal</h1>
          <p className="mt-1 text-sm text-slate-500">
            {investor.investorCode
              ? `Referral Partner Code ${investor.investorCode}`
              : "Registration fee pending — contact your channel partner."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/investor/profile"
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition"
          >
            <span>👤</span>
            <span>Profile & KYC</span>
          </a>
          <a
            href="/investor/documents"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
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
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Referring channel partner</p>
          <p className="mt-1 text-base font-semibold text-slate-900">
            {investor.referringAgent.user?.name ?? investor.referringAgent.shopName ?? "Direct"}
          </p>
          <p className="text-xs text-blue-600 font-mono font-bold">
            Code: {investor.referringAgent.agentCode ?? "—"}
          </p>
          {investor.referringAgent.user?.phone && (
            <div className="mt-2 flex items-center gap-2">
              <a
                href={`tel:${investor.referringAgent.user.phone}`}
                className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 hover:bg-slate-200"
              >
                📞 Call
              </a>
              <a
                href={`https://wa.me/91${investor.referringAgent.user.phone.replace(/\D/g, "").slice(-10)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
              >
                💬 WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>

      {investor.expiresAt && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Registration valid until {investor.expiresAt.toLocaleDateString("en-IN")}.
        </p>
      )}

      {/* Legal Papers Vault & Verification Overview */}
      <div className="mt-8 rounded-3xl border border-indigo-100 bg-linear-to-br from-indigo-50/60 via-white to-purple-50/30 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100/80 pb-3">
          <div>
            <h2 className="text-base font-black text-slate-900">Legal Paper Vault & Banking Status</h2>
            <p className="text-xs text-slate-500">
              Access your signed property agreements, customer bank loan papers, and company contract.
            </p>
          </div>
          <a
            href="/investor/documents"
            className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition"
          >
            Open Legal Vault →
          </a>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <a
            href="/investor/documents"
            className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs hover:border-indigo-300 transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-base">📄</span>
              <span className="text-[10px] font-bold text-indigo-600 group-hover:underline">View</span>
            </div>
            <p className="mt-2 font-bold text-slate-900">Agreement to Sale</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Signed property deal</p>
          </a>

          <a
            href="/investor/documents"
            className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs hover:border-indigo-300 transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-base">🏦</span>
              <span className="text-[10px] font-bold text-indigo-600 group-hover:underline">View</span>
            </div>
            <p className="mt-2 font-bold text-slate-900">Bank Loan Papers</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Sanctions & NOCs</p>
          </a>

          <a
            href="/investor/documents"
            className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs hover:border-indigo-300 transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-base">📑</span>
              <span className="text-[10px] font-bold text-indigo-600 group-hover:underline">View</span>
            </div>
            <p className="mt-2 font-bold text-slate-900">Property Papers</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Registry & Title search</p>
          </a>

          <a
            href="/investor/documents"
            className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs hover:border-indigo-300 transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-base">🤝</span>
              <span className="text-[10px] font-bold text-indigo-600 group-hover:underline">View</span>
            </div>
            <p className="mt-2 font-bold text-slate-900">Company Agreement</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Referral Partner profit contract</p>
          </a>
        </div>
      </div>

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
