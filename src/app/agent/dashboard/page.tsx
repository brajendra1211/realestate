import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId, getAgentCommissionSummary } from "@/lib/agent";
import { formatINR } from "@/lib/format";

const STATUS_COPY: Record<string, { title: string; body: string; tone: string }> = {
  PENDING: {
    title: "Verification pending",
    body: "Your profile and documents are with admin for verification. This usually takes 24-48 hours.",
    tone: "bg-amber-50 text-amber-800",
  },
  REJECTED: {
    title: "Application rejected",
    body: "Your application was rejected. Contact support to resubmit.",
    tone: "bg-red-50 text-red-700",
  },
  APPROVED: {
    title: "Verified — awaiting Prime activation",
    body: "Your profile is verified. Admin will activate your Prime plan next to issue your Agent Code.",
    tone: "bg-blue-50 text-blue-700",
  },
};

const COMMISSION_LABELS: Record<string, string> = {
  REGISTRATION_REFERRAL: "Investor Registration Referral (10%)",
  DEAL_PROFIT_SHARE: "Investor Deal Profit Share (10%)",
  BROKERAGE: "Buyer/Seller Brokerage (1%)",
  UNLOCK_SPLIT: "Customer Unlock Pass Split",
  GOLD_SPLIT: "Customer Gold Listing Split",
};

export default async function AgentDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const { totals } = await getAgentCommissionSummary(agent.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Agent Dashboard</h1>

      {agent.status !== "APPROVED" || !agent.primeStatus ? (
        <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${STATUS_COPY[agent.status].tone}`}>
          <p className="font-semibold">{STATUS_COPY[agent.status].title}</p>
          <p className="mt-1">{STATUS_COPY[agent.status].body}</p>
          {agent.status === "REJECTED" && agent.rejectionReason && (
            <p className="mt-1 font-medium">Reason: {agent.rejectionReason}</p>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          <p className="font-semibold">Prime active</p>
          <p className="mt-1">
            Your Agent Code is <span className="font-mono font-semibold">{agent.agentCode}</span>
          </p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Wallet balance</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatINR(agent.walletBalance)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Linked investors</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{agent.investors.length}</p>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Commission breakdown</h2>
      <p className="mt-1 text-sm text-slate-500">
        Each category is tracked separately and never merged into a single number.
      </p>
      <div className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {Object.entries(COMMISSION_LABELS).map(([type, label]) => (
          <div key={type} className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-slate-600">{label}</span>
            <span className="font-semibold text-slate-900">{formatINR(totals[type] ?? 0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
