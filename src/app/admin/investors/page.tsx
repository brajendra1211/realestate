import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PAYMENT_MODES, PAYMENT_MODE_LABELS, formatINR } from "@/lib/format";
import { getInvestorsExpiringSoon } from "@/lib/investor";
import { confirmInvestorPaymentAction, updateInvestorCapitalAction } from "./actions";

type SearchParams = Promise<{ status?: string; saved?: string; error?: string }>;

export default async function AdminInvestorsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { status, saved, error } = await searchParams;
  const filterStatus = status === "PAID" ? "PAID" : status === "PENDING" ? "PENDING" : undefined;

  const [investors, expiringSoon, allForStats, profitTotals] = await Promise.all([
    prisma.investorProfile.findMany({
      where: filterStatus ? { feeStatus: filterStatus } : {},
      include: {
        user: true,
        referringAgent: { include: { user: true } },
        _count: { select: { profitDistributions: true, agreements: true, documentVaultItems: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    getInvestorsExpiringSoon(30),
    prisma.investorProfile.findMany({ select: { feeStatus: true, registrationFee: true, totalInvested: true } }),
    prisma.investorLedgerEntry.groupBy({ by: ["investorProfileId"], _sum: { amount: true } }),
  ]);
  const profitOf = new Map(profitTotals.map((p) => [p.investorProfileId, p._sum.amount ?? 0]));
  const stat = {
    total: allForStats.length,
    paid: allForStats.filter((i) => i.feeStatus === "PAID").length,
    pending: allForStats.filter((i) => i.feeStatus === "PENDING").length,
    collected: allForStats.filter((i) => i.feeStatus === "PAID").reduce((s, i) => s + i.registrationFee, 0),
    capital: allForStats.reduce((s, i) => s + i.totalInvested, 0),
  };

  const filterLink = (value: string) => `/admin/investors?status=${value}`;

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <h1 className="text-2xl font-bold text-slate-900">Referral Partners</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        Manage registered investors, confirm annual registration fees (₹20,000/yr), issue Referral Partner Codes, and track invested capital &amp; profit shares.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { l: "Total partners", v: String(stat.total), c: "is-cyan" },
          { l: "Fee paid", v: String(stat.paid), c: "is-green" },
          { l: "Fee pending", v: String(stat.pending), c: "is-red" },
          { l: "Fees collected", v: formatINR(stat.collected), c: "is-green" },
          { l: "Active capital", v: formatINR(stat.capital), c: "is-violet" },
        ].map((x) => (
          <div key={x.l} className="neon-card p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{x.l}</p>
            <p className={`mt-1 text-2xl font-bold ${x.c === "is-red" ? "text-rose-600" : "text-ink"}`}>{x.v}</p>
          </div>
        ))}
      </div>

      {expiringSoon.length > 0 && (
        <div className="mt-4 max-w-2xl rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <p className="font-semibold">
            {expiringSoon.length} referral partner{expiringSoon.length > 1 ? "s" : ""} expiring within 30 days
          </p>
          <ul className="mt-1 space-y-0.5">
            {expiringSoon.map((inv) => (
              <li key={inv.id}>
                {inv.investorCode} · {inv.user.name} · {inv.referringAgent.agentCode} · expires{" "}
                {inv.expiresAt!.toLocaleDateString("en-IN")}
              </li>
            ))}
          </ul>
        </div>
      )}

      {saved === "1" && (
        <p className="mt-4 max-w-2xl rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Saved.</p>
      )}
      {saved === "capital" && (
        <p className="mt-4 max-w-2xl rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Invested capital updated.
        </p>
      )}
      {error && (
        <p className="mt-4 max-w-2xl rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Enter a valid capital amount.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        {[
          { label: "All Referral Partners", value: "ALL" },
          { label: "Fee Paid", value: "PAID" },
          { label: "Pending Verification", value: "PENDING" },
        ].map((item) => (
          <a
            key={item.value}
            href={filterLink(item.value)}
            className={`rounded-full border px-3 py-1.5 font-medium ${
              (filterStatus ?? "ALL") === item.value
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </a>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {investors.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
            No referral partners found in this filter.
          </p>
        ) : (
          investors.map((investor) => (
            <div
              key={investor.id}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900"><a href={`/admin/people/${investor.userId}`} className="hover:text-brand-600 hover:underline">{investor.user.name}</a></p>
                  {investor.investorCode && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 font-mono text-xs font-semibold text-blue-700">
                      {investor.investorCode}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      investor.feeStatus === "PAID"
                        ? "bg-green-50 text-green-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {investor.feeStatus === "PAID" ? "Fee paid" : "Fee pending"}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  {investor.user.phone ?? "No phone"} · {investor.user.email ?? "No email"}
                  {investor.user.whatsappNumber && ` · WhatsApp ${investor.user.whatsappNumber}`}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {[
                    ["PAN", investor.user.panCardUrl],
                    ["Aadhaar", investor.user.aadhaarFrontUrl && investor.user.aadhaarBackUrl],
                    ["Cheque", investor.user.cancelledChequeUrl],
                  ].map(([label, ok]) => (
                    <span key={String(label)} className={`neon-chip ${ok ? "is-green" : "is-red"}`}>
                      {ok ? "✓" : "✕"} {label}
                    </span>
                  ))}
                  <span className="neon-chip is-muted">{investor._count.agreements} agreements</span>
                  <span className="neon-chip is-muted">{investor._count.documentVaultItems} documents</span>
                </div>
                <p className="text-xs text-slate-400">
                  Referred by{" "}
                  <span className="font-medium text-slate-600">
                    {investor.referringAgent.agentCode ?? investor.referringAgent.user.name}
                  </span>{" "}
                  · Fee ₹{investor.registrationFee.toLocaleString("en-IN")}
                  {investor.feePaymentMode && ` via ${PAYMENT_MODE_LABELS[investor.feePaymentMode]}`}
                  {investor.expiresAt && ` · expires ${investor.expiresAt.toLocaleDateString("en-IN")}`}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Active capital: <span className="font-semibold">{formatINR(investor.totalInvested)}</span> · Profit credited:{" "}
                  <span className="font-semibold">{formatINR(profitOf.get(investor.id) ?? 0)}</span> · {investor._count.profitDistributions} deal cycles
                </p>
                <a
                  href={`/admin/people/${investor.userId}`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-800"
                >
                  Open full details (KYC, bank, documents, ledger) →
                </a>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
              {investor.feeStatus === "PAID" && (
                <form action={updateInvestorCapitalAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={investor.id} />
                  <input
                    type="number"
                    name="totalInvested"
                    min={0}
                    defaultValue={investor.totalInvested}
                    className="w-32 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  />
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Set capital
                  </button>
                </form>
              )}
              {investor.feeStatus === "PENDING" && (
                <form action={confirmInvestorPaymentAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={investor.id} />
                  <select
                    name="paymentMode"
                    defaultValue="BANK_TRANSFER"
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  >
                    {PAYMENT_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {PAYMENT_MODE_LABELS[mode]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Confirm ₹20,000 Payment Received
                  </button>
                </form>
              )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
