import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDealHistory } from "@/lib/deal";
import { formatINR, PAYMENT_MODES, PAYMENT_MODE_LABELS } from "@/lib/format";
import { recordDealAction, distributeProfitAction } from "./actions";

type SearchParams = Promise<{ saved?: string; error?: string }>;

const ERROR_MESSAGES: Record<string, string> = {
  validation: "Enter a valid amount.",
  noAgents: "Pick at least one agent for the deal.",
  buyerAgentNotFound: "Buyer agent not found.",
  sellerAgentNotFound: "Seller agent not found.",
  notFound: "Investor not found.",
};

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
const selectClass = inputClass;

export default async function AdminDealsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const { saved, error } = await searchParams;

  const [agents, investors, deals] = await Promise.all([
    prisma.agentProfile.findMany({
      where: { primeStatus: true },
      select: { id: true, agentCode: true, user: { select: { name: true } } },
      orderBy: { agentCode: "asc" },
    }),
    prisma.investorProfile.findMany({
      where: { feeStatus: "PAID" },
      select: { id: true, investorCode: true, user: { select: { name: true } } },
      orderBy: { investorCode: "asc" },
    }),
    getDealHistory(),
  ]);

  const profitDistributions = await prisma.profitDistribution.findMany({
    include: {
      investorProfile: { select: { investorCode: true, user: { select: { name: true } } } },
      agent: { select: { agentCode: true } },
    },
    orderBy: { distributedAt: "desc" },
    take: 100,
  });

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10">
      <h1 className="text-2xl font-bold text-slate-900">Deals & Commissions</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500">
        One-click Master Commission Calculator — record a closed deal or an investor profit
        cycle and every payout/ledger line is computed and credited automatically.
      </p>

      {saved === "deal" && (
        <p className="mt-4 max-w-2xl rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Deal recorded — brokerage credited to agent wallet(s).
        </p>
      )}
      {saved === "profit" && (
        <p className="mt-4 max-w-2xl rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Profit distributed — agent, investor, and company shares recorded.
        </p>
      )}
      {error && (
        <p className="mt-4 max-w-2xl rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {ERROR_MESSAGES[error] ?? "Something went wrong. Try again."}
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Record a brokerage deal</h2>
          <p className="mt-1 text-xs text-slate-500">
            1% of deal value to the buyer&apos;s agent, 1% to the seller&apos;s agent — 100% to
            each agent, no company cut (§3.12). Leave either agent blank if only one side is
            represented on this platform.
          </p>
          <form action={recordDealAction} className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Deal value (₹)</label>
              <input type="number" name="dealValue" min={1} required className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Buyer&apos;s agent</label>
              <select name="buyerAgentId" defaultValue="" className={selectClass}>
                <option value="">— none —</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.agentCode} · {agent.user.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Seller&apos;s agent</label>
              <select name="sellerAgentId" defaultValue="" className={selectClass}>
                <option value="">— none —</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.agentCode} · {agent.user.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Payment mode</label>
              <select name="paymentMode" defaultValue="BANK_TRANSFER" className={selectClass}>
                {PAYMENT_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {PAYMENT_MODE_LABELS[mode]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Note (optional)</label>
              <input type="text" name="note" className={inputClass} />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Compute & credit brokerage
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Distribute investor deal profit</h2>
          <p className="mt-1 text-xs text-slate-500">
            10% to referring agent, 10% company expense, 40% investor, 40% company — computed
            from total profit and split into 4 ledger lines in one action (§3.13).
          </p>
          <form action={distributeProfitAction} className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Investor</label>
              <select name="investorProfileId" required defaultValue="" className={selectClass}>
                <option value="" disabled>
                  Select investor
                </option>
                {investors.map((investor) => (
                  <option key={investor.id} value={investor.id}>
                    {investor.investorCode} · {investor.user.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Total deal profit (₹)</label>
              <input type="number" name="totalProfit" min={1} required className={inputClass} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Customer transaction ref (optional)</label>
              <input
                type="text"
                name="customerTransactionRef"
                placeholder="e.g. deal/receipt ID for the investor's ledger"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Payment mode</label>
              <select name="paymentMode" defaultValue="BANK_TRANSFER" className={selectClass}>
                {PAYMENT_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {PAYMENT_MODE_LABELS[mode]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Note (optional)</label>
              <input type="text" name="note" className={inputClass} />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Compute & distribute profit
            </button>
          </form>
        </div>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-slate-900">Brokerage deal history</h2>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Deal value</th>
              <th className="px-4 py-2">Buyer agent</th>
              <th className="px-4 py-2">Seller agent</th>
              <th className="px-4 py-2">Mode</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {deals.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No deals recorded yet.
                </td>
              </tr>
            ) : (
              deals.map((deal) => (
                <tr key={deal.id}>
                  <td className="px-4 py-2 text-slate-500">{deal.dealDate.toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-2 font-medium text-slate-900">{formatINR(deal.dealValue)}</td>
                  <td className="px-4 py-2">
                    {deal.buyerAgent
                      ? `${deal.buyerAgent.agentCode} (${formatINR(deal.buyerCommission ?? 0)})`
                      : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {deal.sellerAgent
                      ? `${deal.sellerAgent.agentCode} (${formatINR(deal.sellerCommission ?? 0)})`
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-slate-500">{PAYMENT_MODE_LABELS[deal.paymentMode]}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-slate-900">Investor profit distribution history</h2>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Investor</th>
              <th className="px-4 py-2">Total profit</th>
              <th className="px-4 py-2">Agent (10%)</th>
              <th className="px-4 py-2">Expense (10%)</th>
              <th className="px-4 py-2">Investor (40%)</th>
              <th className="px-4 py-2">Company (40%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {profitDistributions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  No profit distributions yet.
                </td>
              </tr>
            ) : (
              profitDistributions.map((dist) => (
                <tr key={dist.id}>
                  <td className="px-4 py-2 text-slate-500">
                    {dist.distributedAt.toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-2 font-medium text-slate-900">
                    {dist.investorProfile.investorCode}
                  </td>
                  <td className="px-4 py-2">{formatINR(dist.totalProfit)}</td>
                  <td className="px-4 py-2">{formatINR(dist.agentShare)}</td>
                  <td className="px-4 py-2">{formatINR(dist.expenseShare)}</td>
                  <td className="px-4 py-2">{formatINR(dist.investorShare)}</td>
                  <td className="px-4 py-2">{formatINR(dist.companyShare)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
