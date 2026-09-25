import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId, getAgentCommissionSummary } from "@/lib/agent";
import { getPayoutsForAgent } from "@/lib/payout";
import { getActiveDispatchesForAgent } from "@/lib/dispatch";
import { getRatingsForAgent, isTopRatedAgent } from "@/lib/rating";
import { haversineDistanceKm } from "@/lib/geo";
import { formatINR } from "@/lib/format";
import { DispatchNotifications } from "@/components/agent/DispatchNotifications";
import { requestPayoutAction, setAutoPayMandateAction } from "./actions";

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
  renewalRequired: "Active subscription renewal is required before wallet payout can be withdrawn.",
};

const DISPATCH_ERROR_MESSAGES: Record<string, string> = {
  notPrime: "Your Prime plan isn't active — reactivate it to accept new leads.",
};

type SearchParams = Promise<{ saved?: string; error?: string; dispatchError?: string; mandateError?: string }>;

export default async function AgentDashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session) redirect("/login");

  const agent = await getAgentByUserId(session.user.id);
  if (!agent) redirect("/register/agent");

  const { saved, error, dispatchError, mandateError } = await searchParams;
  const { getAgentSubscriptionStatus } = await import("@/lib/agentPlans");
  const { getAgentCycleProgress, getDirectNetworkAndRenewals } = await import("@/lib/targetCycle");
  const { generateQrDataUrl } = await import("@/lib/qr");
  const { AgentCodeLookup } = await import("@/components/agent/AgentCodeLookup");
  const { AgentAssetCards } = await import("@/components/agent/AgentAssetCards");
  const { AgentQrHeroCard } = await import("@/components/agent/AgentQrHeroCard");
  const { DirectRenewalsTracker } = await import("@/components/agent/DirectRenewalsTracker");

  const [{ totals }, payouts, activeDispatches, { count: ratingCount }, subStatus, cycleProgress, networkData] =
    await Promise.all([
      getAgentCommissionSummary(agent.id),
      getPayoutsForAgent(agent.id),
      agent.primeStatus ? getActiveDispatchesForAgent(agent.id) : Promise.resolve([]),
      getRatingsForAgent(agent.id),
      getAgentSubscriptionStatus(agent.id),
      getAgentCycleProgress(agent.id).catch(() => null),
      getDirectNetworkAndRenewals(agent.id).catch(() => ({ agents: [], listings: [] })),
    ]);

  const originUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { getAgentShopUrl } = await import("@/lib/qr");
  const shopUrl = agent.agentCode ? getAgentShopUrl(agent.agentCode, originUrl) : `${originUrl}/listings`;
  const qrDataUrl = await generateQrDataUrl(shopUrl);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Agent Dashboard</h1>
        {agent.agentCode && (
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-extrabold text-blue-700 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
              Code: {agent.agentCode}
            </span>
          </div>
        )}
      </div>

      {saved === "mandate" && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Auto-Pay UPI mandate saved successfully.
        </p>
      )}
      {mandateError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {mandateError === "invalid" ? "Please enter a valid UPI VPA (e.g. name@upi)." : "Failed to update Auto-Pay mandate."}
        </p>
      )}

      {dispatchError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {DISPATCH_ERROR_MESSAGES[dispatchError] ?? "Something went wrong. Try again."}
        </p>
      )}

      {subStatus?.visibilityDeprioritized && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-bold">⚠️ Visibility Pushback Active</p>
          <p className="mt-1">
            Your agent code subscription has expired. Per system rules, your property listings have been pushed to lowest feed visibility (demoted) and new leads are rerouted. Payout withdrawals are locked until renewed.
          </p>
        </div>
      )}

      {subStatus?.renewalAlertActive && !subStatus?.visibilityDeprioritized && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-bold">🔔 Upcoming Renewal Alert ({subStatus.daysRemaining} Days Remaining)</p>
          <p className="mt-1">
            Your {subStatus.planTier} Plan renewal is due soon. Current wallet balance is insufficient for auto-debit. Please top up your wallet or configure Auto-Pay to prevent property visibility pushback.
          </p>
        </div>
      )}

      {agent.status !== "APPROVED" || !agent.primeStatus ? (
        <div className={`rounded-xl px-4 py-3 text-sm ${STATUS_COPY[agent.status].tone}`}>
          <p className="font-semibold">{STATUS_COPY[agent.status].title}</p>
          <p className="mt-1">{STATUS_COPY[agent.status].body}</p>
          {agent.status === "REJECTED" && agent.rejectionReason && (
            <p className="mt-1 font-medium">Reason: {agent.rejectionReason}</p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-teal-50/40 p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">
                  {subStatus?.planTier === "BASIC" ? "Basic Plan Active" : "Prime Plan Active"}
                </span>
                {/* Traffic Light Sign on Agent Code */}
                {cycleProgress && (
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                      cycleProgress.trafficLight === "GREEN"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : cycleProgress.trafficLight === "YELLOW"
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : "bg-red-100 text-red-800 border-red-300"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        cycleProgress.trafficLight === "GREEN"
                          ? "bg-emerald-500 animate-pulse"
                          : cycleProgress.trafficLight === "YELLOW"
                          ? "bg-amber-500"
                          : "bg-red-500 animate-pulse"
                      }`}
                    />
                    {cycleProgress.trafficLight === "GREEN"
                      ? "🟢 Task Achieved"
                      : cycleProgress.trafficLight === "YELLOW"
                      ? "🟡 In Progress"
                      : "🔴 At Risk / Pending"}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Agent Code:{" "}
                <span className="font-mono font-bold text-blue-700 select-all cursor-pointer bg-blue-50/80 px-2 py-0.5 rounded-lg border border-blue-100" title="Click to select">
                  {agent.agentCode}
                </span>
              </p>
            </div>
            {subStatus?.daysRemaining != null && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                {subStatus.daysRemaining} days to renewal
              </span>
            )}
          </div>
        </div>
      )}

      {/* Prominent Shop QR Standee & Marketing Tools Hero Card */}
      {agent.agentCode && (
        <AgentQrHeroCard
          agentCode={agent.agentCode}
          name={agent.user.name}
          shopName={agent.shopName}
          shopAddress={agent.shopAddress}
          city={agent.city}
          qrDataUrl={qrDataUrl}
          originUrl={originUrl}
        />
      )}

      {/* 2-Month Target Performance Matrix */}
      {cycleProgress && (
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800 uppercase tracking-wider">
                2-Month Target Cycle Performance
              </span>
              <h2 className="mt-1 text-base font-bold text-slate-900">
                {cycleProgress.daysRemaining} Days Remaining in Current 60-Day Cycle
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white border border-indigo-100 px-3 py-1 text-right shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400">Carry-Forward Score</span>
                <p className="text-sm font-extrabold text-indigo-700">+{cycleProgress.carryForwardScore} Pts</p>
              </div>
              {cycleProgress.isTargetMet && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  ✓ 2-Month Task Completed
                </span>
              )}
            </div>
          </div>

          {/* 3 Client Specific 2-Month Target Progress Bars */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Target 1: 20 Customer Properties */}
            <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-xs">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600">Customer Properties</span>
                <span className="text-indigo-600 font-bold">
                  {cycleProgress.achieved.customerProperties} / {cycleProgress.targets.customerProperties}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Target: 20 updates/listings</p>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-indigo-600 transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (cycleProgress.achieved.customerProperties / cycleProgress.targets.customerProperties) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Target 2: 5 Investors */}
            <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-xs">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600">Direct Investors</span>
                <span className="text-indigo-600 font-bold">
                  {cycleProgress.achieved.investors} / {cycleProgress.targets.investors}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Target: 5 investors onboarded</p>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-indigo-600 transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (cycleProgress.achieved.investors / cycleProgress.targets.investors) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Target 3: 10 Agent Codes */}
            <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-xs">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600">Direct Agent Codes</span>
                <span className="text-indigo-600 font-bold">
                  {cycleProgress.achieved.directAgents} / {cycleProgress.targets.directAgents}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Target: 10 new agent codes</p>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-indigo-600 transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (cycleProgress.achieved.directAgents / cycleProgress.targets.directAgents) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {cycleProgress.coupon && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏷️</span>
                <div>
                  <p className="text-xs font-bold text-amber-900">20% Pre-Expiry Discount Coupon Active!</p>
                  <p className="text-[11px] text-amber-700">
                    Code: <span className="font-mono font-bold">{cycleProgress.coupon.code}</span> (Valid for 48 hours)
                  </p>
                </div>
              </div>
              <span className="rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-bold text-white">Save 20% on Renewal</span>
            </div>
          )}
        </div>
      )}

      {/* Marketing Assets: QR Code, Visiting Card, ID Card, Referral Links */}
      {agent.agentCode && (
        <AgentAssetCards
          agentCode={agent.agentCode}
          name={agent.user.name}
          shopName={agent.shopName}
          shopAddress={agent.shopAddress}
          city={agent.city}
          phone={agent.user.phone || ""}
          alternatePhone={agent.alternatePhone}
          whatsapp={agent.user.whatsappNumber}
          planTier={subStatus?.planTier || "BASIC"}
          primeStatus={agent.primeStatus}
          qrDataUrl={qrDataUrl}
          originUrl={originUrl}
        />
      )}

      {/* Agent Code Directory & Quick Connect (Lookup other agents by code) */}
      <AgentCodeLookup />

      {/* Direct Network & Renewals Follow-up Desk (Direct Agents & Customer Property Renewals) */}
      <DirectRenewalsTracker agents={networkData.agents} listings={networkData.listings} />

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

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Wallet balance</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatINR(agent.walletBalance)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Plan Tier</p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {subStatus?.planTier === "BASIC" ? "Basic (₹1,000/mo)" : "Prime (₹2,000/mo)"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {subStatus?.visibilityDeprioritized ? "Expired (Deprioritized)" : "Active Membership"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Rating & Trust</p>
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

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Auto-Pay Mandate (UPI / Google Pay)</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              PDF 2 Rule: If wallet balance is insufficient at renewal date, system deducts via linked mandate to prevent visibility pushback.
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              agent.autoPayActive && agent.autoPayMandate
                ? "bg-green-50 text-green-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {agent.autoPayActive && agent.autoPayMandate ? `Active: ${agent.autoPayMandate}` : "Not Configured"}
          </span>
        </div>

        <form action={setAutoPayMandateAction} className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[220px]">
            <input
              type="text"
              name="vpa"
              placeholder="Enter UPI ID (e.g. mobile@okhdfcbank)"
              defaultValue={agent.autoPayMandate ?? ""}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {agent.autoPayMandate ? "Update Mandate" : "Link Auto-Pay"}
          </button>
        </form>
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
