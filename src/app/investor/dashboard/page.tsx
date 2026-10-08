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
            <svg className="h-3.5 w-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
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
                Call
              </a>
              <a
                href={`https://wa.me/91${investor.referringAgent.user.phone.replace(/\D/g, "").slice(-10)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
              >
                WhatsApp
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
              <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
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
              <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.5M4.5 21V10.5" />
              </svg>
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
              <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
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
              <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
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
