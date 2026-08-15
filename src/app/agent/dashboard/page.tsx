import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId, getAgentCommissionSummary } from "@/lib/agent";
import { getPayoutsForAgent } from "@/lib/payout";
import { getActiveDispatchesForAgent } from "@/lib/dispatch";
import { getRatingsForAgent, isTopRatedAgent } from "@/lib/rating";
import { haversineDistanceKm } from "@/lib/geo";
import { formatINR } from "@/lib/format";
import { DispatchNotifications } from "@/components/agent/DispatchNotifications";
import { requestPayoutAction } from "./actions";

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
  AGENT_REFERRAL: "Agent Referral (10%, one-time)",
};

const PAYOUT_ERROR_MESSAGES: Record<string, string> = {
  validation: "Enter a valid payout amount.",
  insufficientBalance: "That's more than your current wallet balance.",
  notFound: "Agent profile not found.",
};

const DISPATCH_ERROR_MESSAGES: Record<string, string> = {
  notPrime: "Your Prime plan isn't active — reactivate it to accept new leads.",
  alreadyMatched: "Another agent already accepted this lead.",
  notNotified: "This lead is no longer available to you.",
};

type SearchParams = Promise<{ saved?: string; error?: string; dispatchError?: string }>;

export default async function AgentDashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session) redirect("/login");

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const { saved, error, dispatchError } = await searchParams;
  const [{ totals }, payouts, activeDispatches, { count: ratingCount }] = await Promise.all([
    getAgentCommissionSummary(agent.id),
    getPayoutsForAgent(agent.id),
    agent.primeStatus ? getActiveDispatchesForAgent(agent.id) : Promise.resolve([]),
    getRatingsForAgent(agent.id),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Agent Dashboard</h1>

      {dispatchError && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {DISPATCH_ERROR_MESSAGES[dispatchError] ?? "Something went wrong. Try again."}
        </p>
      )}

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

      {agent.primeStatus && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-slate-900">Incoming leads</h2>
          <p className="mt-1 text-sm text-slate-500">
            First to accept wins the lead — §3.5&apos;s Uber-style cascade dispatch.
          </p>
          <div className="mt-3">
            <DispatchNotifications
              agentProfileId={agent.id}
              initial={activeDispatches.map((d) => ({
                dispatchRequestId: d.id,
                batch: d.currentBatch,
                distanceKm:
                  agent.shopLatitude != null && agent.shopLongitude != null
                    ? Math.round(
                        haversineDistanceKm(
                          { latitude: agent.shopLatitude, longitude: agent.shopLongitude },
                          { latitude: d.latitude, longitude: d.longitude }
                        ) * 10
                      ) / 10
                    : 0,
              }))}
            />
          </div>
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
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Rating</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {(agent.ratingAvg ?? 0).toFixed(1)} ★{" "}
            <span className="text-sm font-normal text-slate-400">({ratingCount})</span>
          </p>
          {isTopRatedAgent(agent.ratingAvg, ratingCount) && (
            <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
              Top Rated Prime Agent
            </span>
          )}
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

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Withdraw to bank</h2>
      <p className="mt-1 text-sm text-slate-500">
        TDS is deducted automatically before the payout is marked paid by admin.
      </p>

      {saved === "payout" && (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Payout requested — pending admin processing.
        </p>
      )}
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {PAYOUT_ERROR_MESSAGES[error] ?? "Something went wrong. Try again."}
        </p>
      )}

      <form action={requestPayoutAction} className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-sm font-medium text-slate-700">Amount (₹)</label>
          <input
            type="number"
            name="amount"
            min={1}
            max={agent.walletBalance}
            required
            className="mt-1 w-40 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={agent.walletBalance <= 0}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Request payout
        </button>
      </form>

      {payouts.length > 0 && (
        <div className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {payouts.map((payout) => (
            <div key={payout.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="text-slate-600">
                  {formatINR(payout.grossAmount)} gross · {formatINR(payout.tdsAmount)} TDS ·{" "}
                  <span className="font-semibold text-slate-900">{formatINR(payout.netAmount)} net</span>
                </p>
                <p className="text-xs text-slate-400">{payout.requestedAt.toLocaleDateString("en-IN")}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  payout.status === "PAID"
                    ? "bg-green-50 text-green-700"
                    : payout.status === "REJECTED"
                      ? "bg-red-50 text-red-700"
                      : "bg-amber-50 text-amber-700"
                }`}
              >
                {payout.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
