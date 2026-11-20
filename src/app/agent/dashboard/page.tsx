import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getAgentByUserId, getAgentCommissionSummary } from "@/lib/agent";
import { getPayoutsForAgent } from "@/lib/payout";
import { getActiveDispatchesForAgent } from "@/lib/dispatch";
import { getRatingsForAgent, isTopRatedAgent } from "@/lib/rating";
import { haversineDistanceKm } from "@/lib/geo";
import { formatINR } from "@/lib/format";
import { getSiteSettings } from "@/lib/site-settings";
import { getRingAlertsForAgent } from "@/lib/ringAlerts";
import { DispatchNotifications } from "@/components/agent/DispatchNotifications";
import { requestPayoutAction, setAutoPayMandateAction } from "./actions";
import { getAgentPlans } from "@/lib/agentPlans";
import { AgentPlanCheckout } from "@/components/agent/AgentPlanCheckout";
import { PlanConvertCard } from "@/components/agent/PlanConvertCard";
import { previewPlanConversion } from "@/lib/planConversion";
import { Tabs } from "@/components/ui/Tabs";
import {
  AlertTriangle, ArrowRight, Bell, Building2, CalendarCheck, Crown, FileText, PlusCircle, Phone, Radio,
  Receipt, Star, Ticket, UserPlus, UserRound, Wallet,
} from "lucide-react";

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
    body: "Your profile is verified. Admin will activate your Prime plan next to issue your Channel Partner Code.",
    tone: "bg-blue-50 text-blue-700",
  },
};

const COMMISSION_LABELS: Record<string, string> = {
  AGENT_REFERRAL: "Partner referral income",
  CUSTOMER_PROPERTY_UPDATE: "Customer property update income",
  UNLOCK_SPLIT: "Contact unlock income",
  REGISTRATION_REFERRAL: "Referral partner joining income",
  DEAL_PROFIT_SHARE: "Referral partner deal profit income",
  REFERRAL_CUSTOMER_RENEWAL: "Customer renewal income",
  BROKERAGE: "Property sale & buying brokerage",
  GOLD_SPLIT: "Direct customer Gold listing income",
  COMPANY_FIVE_STAR_REWARD: "5-star performance reward",
};

const PAYOUT_ERROR_MESSAGES: Record<string, string> = {
  validation: "Enter a valid payout amount.",
  insufficientBalance: "That's more than your current wallet balance.",
  notFound: "Channel Partner profile not found.",
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

  const [
    { totals, entries },
    payouts,
    activeDispatches,
    { count: ratingCount },
    subStatus,
    cycleProgress,
    networkData,
    siteSettings,
    ringAlerts,
  ] = await Promise.all([
    getAgentCommissionSummary(agent.id),
    getPayoutsForAgent(agent.id),
    agent.primeStatus ? getActiveDispatchesForAgent(agent.id) : Promise.resolve([]),
    getRatingsForAgent(agent.id),
    getAgentSubscriptionStatus(agent.id),
    getAgentCycleProgress(agent.id).catch(() => null),
    getDirectNetworkAndRenewals(agent.id).catch(() => ({ agents: [], listings: [] })),
    getSiteSettings(),
    getRingAlertsForAgent(agent.id),
  ]);

  const { siteName } = siteSettings;
  const payPlans = await getAgentPlans();
  // Basic -> Prime without paying again: the unused days convert into (fewer) Prime days.
  const primeMonthly = payPlans.find((pl) => pl.tier === "PRIME" && pl.months === 1);
  const conversion =
    subStatus?.planTier === "BASIC" && primeMonthly ? await previewPlanConversion(agent.id, primeMonthly.id) : null;
  const pickerPlans = payPlans.map(({ id, name, tier, price, durationDays, months, listingLimit }) => ({ id, name, tier, price, durationDays, months, listingLimit }));
  const originUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { getAgentShopUrl } = await import("@/lib/qr");
  const shopUrl = agent.agentCode ? getAgentShopUrl(agent.agentCode, originUrl) : `${originUrl}/listings`;
  const qrDataUrl = await generateQrDataUrl(shopUrl);

  const totalEarned = Object.values(totals).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const pendingPayoutCount = payouts.filter((p) => p.status === "PENDING").length;
  const firstName = (agent.user.name ?? "Partner").split(" ")[0];

  const targetRows = cycleProgress
    ? [
        { label: "Properties listed", achieved: cycleProgress.achieved.properties, target: cycleProgress.targets.properties, remaining: cycleProgress.remaining.properties, pct: cycleProgress.percentages.properties, unit: "properties", bar: "bg-brand-600" },
        { label: "Downline partners", achieved: cycleProgress.achieved.directAgents, target: cycleProgress.targets.directAgents, remaining: cycleProgress.remaining.directAgents, pct: cycleProgress.percentages.directAgents, unit: "partners", bar: "bg-violet-600" },
        { label: "Referral partners added", achieved: cycleProgress.achieved.investors, target: cycleProgress.targets.investors, remaining: cycleProgress.remaining.investors, pct: cycleProgress.percentages.investors, unit: "referral partners", bar: "bg-emerald-600" },
      ]
    : [];

  const quickActions = [
    { href: "/agent/owner-requests", label: "Owner requests", hint: "Paid owners waiting for a call", icon: Bell, tint: "from-amber-500 to-orange-600" },
    { href: "/agent/listings/new", label: "Add rental listing", hint: "Post a new property", icon: PlusCircle, tint: "from-brand-500 to-brand-700" },
    { href: "/agent/listings", label: "My listings", hint: "Edit or renew", icon: Building2, tint: "from-sky-500 to-cyan-600" },
    { href: "/agent/investors/new", label: "Add referral partner", hint: "Earn joining income", icon: UserPlus, tint: "from-emerald-500 to-teal-600" },
    { href: "/agent/broadcast", label: "B2B broadcast", hint: "Reach other partners", icon: Radio, tint: "from-violet-500 to-purple-600" },
    { href: "/agent/appointments", label: "Scheduled visits", hint: "Upcoming site visits", icon: CalendarCheck, tint: "from-amber-500 to-orange-600" },
    { href: "/agent/gold-feed", label: "Direct customer listings", hint: "Customer-posted homes", icon: Star, tint: "from-rose-500 to-pink-600" },
    { href: "/agent/buyer-leads", label: "Buyer leads", hint: "Buyers who paid to see a home", icon: UserRound, tint: "from-emerald-500 to-green-600" },
  ];

  const trafficTone =
    cycleProgress?.trafficLight === "GREEN"
      ? { cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500", text: "On track" }
      : cycleProgress?.trafficLight === "YELLOW"
        ? { cls: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500", text: "In progress" }
        : { cls: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500", text: "At risk" };

  const card = "rounded-3xl border border-slate-200/80 bg-white p-5 shadow-soft sm:p-6";
  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-sm font-medium text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100";
  const noticeCls = (tone: "green" | "red") =>
    tone === "green"
      ? "rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200"
      : "rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 ring-1 ring-inset ring-rose-200";

  /* ------------------------------- TAB: OVERVIEW ------------------------------- */
  const overview = (
    <>
      {agent.primeStatus && (
        <section className={card}>
          <h2 className="font-display text-2xl font-semibold text-ink">Incoming leads</h2>
          <p className="mt-1 text-sm text-slate-500">The first partner to accept a lead gets it — keep this page open to catch new ones.</p>
          <div className="mt-4">
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
        </section>
      )}

      {cycleProgress && (
        <section className={card}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-semibold text-ink">{cycleProgress.cycleDays}-day target</h2>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${trafficTone.cls}`}>
                  <span className={`h-2 w-2 rounded-full ${trafficTone.dot}`} /> {trafficTone.text}
                </span>
                {cycleProgress.customTargetEnabled && (
                  <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700 ring-1 ring-inset ring-violet-200">Custom target</span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">{cycleProgress.daysRemaining} days left in this cycle</p>
            </div>
            <div className="rounded-2xl bg-brand-50 px-4 py-2 text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700/70">Overall</p>
              <p className="font-display text-2xl font-semibold text-brand-700">{cycleProgress.percentages.overall}%</p>
            </div>
          </div>

          {cycleProgress.isTargetMet && (
            <p className={`${noticeCls("green")} mt-4`}>Target completed — great work!</p>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {targetRows.map((row) => (
              <div key={row.label} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-bold text-ink">{row.label}</span>
                  <span className="text-sm font-semibold text-slate-500">
                    <b className="text-ink">{row.achieved}</b> / {row.target}
                  </span>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div className={`h-full rounded-full ${row.bar} transition-all`} style={{ width: `${Math.min(100, row.pct)}%` }} />
                </div>
                <p className={`mt-2 text-xs font-semibold ${row.remaining > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                  {row.remaining > 0 ? `${row.remaining} more ${row.unit} to go` : "Target achieved"}
                </p>
              </div>
            ))}
          </div>

          {cycleProgress.coupon && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-amber-50 p-4 ring-1 ring-inset ring-amber-200">
              <div className="flex items-center gap-3">
                <Ticket className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-bold text-amber-900">20% renewal discount unlocked</p>
                  <p className="text-xs text-amber-700">
                    Code <span className="font-mono font-bold">{cycleProgress.coupon.code}</span> · valid for 48 hours
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`${card} flex flex-col justify-between`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Your plan</p>
            <p className="font-display mt-1 text-2xl font-semibold text-ink">
              {subStatus?.planTier === "BASIC"
                ? `Basic · ₹${siteSettings.agentBasicPlanPrice.toLocaleString("en-IN")}/mo`
                : `Prime · ₹${siteSettings.agentPrimePlanPrice.toLocaleString("en-IN")}/mo`}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {subStatus?.planTier === "BASIC"
                ? "10 listings limit · standard ranking"
                : "Unlimited listings · priority feed ranking"}
            </p>
          </div>
          {subStatus?.planTier === "BASIC" || (agent.agentCode && !agent.primeStatus) ? (
            <div className="mt-5 space-y-4">
              {conversion && (
                <PlanConvertCard
                  toPlanId={conversion.toPlanId}
                  fromPlanName={conversion.fromPlanName}
                  toPlanName={conversion.toPlanName}
                  remainingDays={conversion.remainingDays}
                  remainingValue={conversion.remainingValue}
                  newDays={conversion.newDays}
                  newEndDate={conversion.newEndDate.toISOString()}
                />
              )}
              <AgentPlanCheckout plans={pickerPlans} mode="upgrade" />
            </div>
          ) : (
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-violet-700">
              <Crown className="h-4 w-4" /> Top-priority Prime is active
            </span>
          )}
        </section>

        <section className={card}>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Rating &amp; trust</p>
          <p className="font-display mt-1 flex items-baseline gap-2 text-4xl font-semibold text-ink">
            {(agent.ratingAvg ?? 0).toFixed(1)}
            <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
            <span className="text-sm font-medium text-slate-400">({ratingCount} reviews)</span>
          </p>
          {isTopRatedAgent(agent.ratingAvg, ratingCount) && (
            <span className="mt-3 inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-inset ring-amber-200">
              Top-rated Prime partner
            </span>
          )}
        </section>
      </div>

      <section className={card}>
        <h2 className="flex items-center gap-2 font-display text-2xl font-semibold text-ink">
          <Bell className="h-5 w-5 text-brand-600" /> Ring alerts
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-sans text-xs font-bold text-slate-500">{ringAlerts.length}</span>
        </h2>
        <p className="mt-1 text-sm text-slate-500">Buyers who rang one of your listings. Check here any time you missed a live alert.</p>
        {ringAlerts.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">No rings yet.</p>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {ringAlerts.map((ring) => (
              <div key={ring.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-bold text-ink">{ring.buyerName}</p>
                  <p className="truncate text-xs text-slate-500">
                    {ring.listingTitle} · {ring.createdAt.toLocaleString("en-IN")}
                  </p>
                </div>
                {ring.buyerPhone && (
                  <a href={`tel:${ring.buyerPhone}`} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700">
                    <Phone className="h-4 w-4" /> Call
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );

  /* ------------------------------- TAB: EARNINGS ------------------------------- */
  const earnings = (
    <>
      <section id="withdraw" className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">Withdraw to bank</h2>
            <p className="mt-1 text-sm text-slate-500">TDS is deducted automatically. Admin marks it paid once the money is sent.</p>
          </div>
          <Link href="/agent/payments?tab=payouts" className="text-sm font-semibold text-brand-600 hover:underline">
            All payouts ({payouts.length}) →
          </Link>
        </div>

        {saved === "payout" && <p className={`${noticeCls("green")} mt-4`}>Payout requested — pending admin processing.</p>}
        {error && <p className={`${noticeCls("red")} mt-4`}>{PAYOUT_ERROR_MESSAGES[error] ?? "Something went wrong. Try again."}</p>}

        <form action={requestPayoutAction} className="mt-5 flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Amount (₹) · available {formatINR(agent.walletBalance)}
            </label>
            <input type="number" name="amount" min={1} max={agent.walletBalance} required className={inputCls} placeholder="Enter amount" />
          </div>
          <button
            type="submit"
            disabled={agent.walletBalance <= 0}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-brand-600/25 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Wallet className="h-4 w-4" /> Request payout
          </button>
        </form>

        {payouts.length > 0 && (
          <div className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-200/80">
            {payouts.map((payout) => (
              <div key={payout.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="text-slate-600">
                    {formatINR(payout.grossAmount)} − {formatINR(payout.tdsAmount)} TDS ={" "}
                    <b className="text-ink">{formatINR(payout.netAmount)}</b>
                  </p>
                  <p className="text-xs text-slate-400">{payout.requestedAt.toLocaleDateString("en-IN")}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-bold ring-1 ring-inset ${
                    payout.status === "PAID"
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : payout.status === "REJECTED"
                        ? "bg-rose-50 text-rose-700 ring-rose-200"
                        : "bg-amber-50 text-amber-700 ring-amber-200"
                  }`}
                >
                  {payout.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">Where your income comes from</h2>
            <p className="mt-1 text-sm text-slate-500">Each income type is tracked separately.</p>
          </div>
          <Link href="/agent/payments" className="text-sm font-semibold text-brand-600 hover:underline">
            Full history ({entries.length}) →
          </Link>
        </div>
        <div className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200/80">
          {Object.entries(COMMISSION_LABELS).map(([type, label]) => {
            const amount = totals[type] ?? 0;
            return (
              <div key={type} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <span className={amount > 0 ? "font-medium text-ink" : "text-slate-500"}>{label}</span>
                <span className={`font-semibold ${amount > 0 ? "text-emerald-700" : "text-slate-400"}`}>{formatINR(amount)}</span>
              </div>
            );
          })}
        </div>

        {entries.length > 0 && (
          <>
            <h3 className="mt-6 text-sm font-bold text-ink">Latest credits</h3>
            <div className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-200/80">
              {entries.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{COMMISSION_LABELS[entry.type] ?? entry.type}</p>
                    <p className="truncate text-xs text-slate-500">{entry.note || "Commission credit"}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display text-lg font-semibold text-emerald-700">+{formatINR(entry.amount)}</p>
                    <p className="text-[11px] text-slate-400">{entry.createdAt.toLocaleDateString("en-IN")}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">Auto-pay (UPI)</h2>
            <p className="mt-1 text-sm text-slate-500">If your wallet is short on renewal day, we deduct via this UPI ID so your listings never lose visibility.</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset ${
              agent.autoPayActive && agent.autoPayMandate ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200"
            }`}
          >
            {agent.autoPayActive && agent.autoPayMandate ? `Active: ${agent.autoPayMandate}` : "Not set up"}
          </span>
        </div>
        <form action={setAutoPayMandateAction} className="mt-4 flex flex-wrap items-center gap-3">
          <div className="min-w-[220px] flex-1">
            <input type="text" name="vpa" placeholder="Your UPI ID, e.g. mobile@okhdfcbank" defaultValue={agent.autoPayMandate ?? ""} required className={inputCls} />
          </div>
          <button type="submit" className="cursor-pointer rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-700">
            {agent.autoPayMandate ? "Update" : "Link auto-pay"}
          </button>
        </form>
      </section>
    </>
  );

  /* ------------------------------ TAB: MARKETING ------------------------------ */
  const marketing = agent.agentCode ? (
    <>
      <AgentQrHeroCard
        agentCode={agent.agentCode}
        name={agent.user.name}
        shopName={agent.shopName}
        shopAddress={agent.shopAddress}
        city={agent.city}
        qrDataUrl={qrDataUrl}
        originUrl={originUrl}
        unlockFee={siteSettings.unlockPassAmount}
      />
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
        siteName={siteName}
      />
    </>
  ) : (
    <p className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
      Your QR code, visiting card and ID card appear here once your Channel Partner Code is issued.
    </p>
  );

  /* ------------------------------- TAB: NETWORK ------------------------------- */
  const network = (
    <>
      <AgentCodeLookup siteName={siteName} />
      <DirectRenewalsTracker agents={networkData.agents} listings={networkData.listings} siteName={siteName} />
    </>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-600">Channel partner portal</p>
          <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">Namaste, {firstName}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {agent.agentCode && (
            <span className="rounded-xl bg-white px-4 py-2 font-mono text-sm font-bold text-brand-700 ring-1 ring-inset ring-brand-200">
              {agent.agentCode}
            </span>
          )}
          <Link href="/agent/profile" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-brand-600 hover:text-brand-700">
            <UserRound className="h-4 w-4" /> Profile &amp; KYC
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {saved === "mandate" && <p className={noticeCls("green")}>Auto-pay UPI mandate saved.</p>}
      {saved === "plan" && <p className={noticeCls("green")}>Plan updated — you now have unlimited listings and top-priority placement.</p>}
      {mandateError && <p className={noticeCls("red")}>{mandateError === "invalid" ? "Please enter a valid UPI ID (e.g. name@upi)." : "Could not update auto-pay."}</p>}
      {dispatchError && <p className={noticeCls("red")}>{DISPATCH_ERROR_MESSAGES[dispatchError] ?? "Something went wrong. Try again."}</p>}

      {subStatus?.visibilityDeprioritized && (
        <div className="flex gap-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-inset ring-rose-200">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">Your listings are hidden lower in search</p>
            <p className="mt-0.5">Your subscription expired, so listings are demoted, new leads are rerouted and payouts are locked until you renew.</p>
          </div>
        </div>
      )}
      {subStatus?.renewalAlertActive && !subStatus?.visibilityDeprioritized && (
        <div className="flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
          <Bell className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">Renewal due in {subStatus.daysRemaining} days</p>
            <p className="mt-0.5">Your {subStatus.planTier} plan is due soon and your wallet is short. Top up, or set up auto-pay in the Earnings tab.</p>
          </div>
        </div>
      )}
      {(agent.status !== "APPROVED" || !agent.primeStatus) && (
        <div className={`rounded-2xl px-4 py-3 text-sm ${STATUS_COPY[agent.status].tone}`}>
          <p className="font-bold">{STATUS_COPY[agent.status].title}</p>
          <p className="mt-0.5">{STATUS_COPY[agent.status].body}</p>
          {agent.status === "REJECTED" && agent.rejectionReason && <p className="mt-1 font-semibold">Reason: {agent.rejectionReason}</p>}
          {agent.status === "PENDING" && !agent.agentCode && pickerPlans.length > 0 && (
            <div className="mt-4 rounded-2xl bg-white p-4 text-slate-800 shadow-xs">
              <p className="mb-3 text-sm font-bold">Pay now to get approved instantly — no admin wait.</p>
              <AgentPlanCheckout plans={pickerPlans} mode="register" />
            </div>
          )}
        </div>
      )}

      {/* Wallet + key numbers */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-3xl bg-brand-950 p-6 text-white shadow-lift lg:col-span-2">
          <div className="absolute -right-12 -top-12 h-52 w-52 rounded-full bg-brand-500/40 blur-3xl" />
          <div className="absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-gold-400/20 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Wallet className="h-4 w-4 text-gold-300" /> Wallet balance
              </p>
              <p className="font-display mt-2 text-5xl font-semibold">{formatINR(agent.walletBalance)}</p>
              <p className="mt-2 text-sm text-slate-300">
                {pendingPayoutCount > 0 ? `${pendingPayoutCount} payout waiting for admin` : "Ready to withdraw anytime"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href="#tab-earnings" className="shine inline-flex items-center gap-2 rounded-xl bg-gold-400 px-5 py-3 text-sm font-bold text-ink transition hover:bg-gold-300">
                Withdraw <ArrowRight className="h-4 w-4" />
              </a>
              <Link href="/agent/payments" className="inline-flex items-center rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                History
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
          <div className={card}>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total earned</p>
            <p className="font-display mt-1 text-3xl font-semibold text-emerald-700">{formatINR(totalEarned)}</p>
          </div>
          <div className={card}>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Plan</p>
            <p className="font-display mt-1 text-3xl font-semibold text-ink">{subStatus?.planTier === "BASIC" ? "Basic" : "Prime"}</p>
            {subStatus?.daysRemaining != null && <p className="text-xs text-slate-500">{subStatus.daysRemaining} days to renewal</p>}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                className="group flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft transition-all hover:-translate-y-1 hover:border-transparent hover:shadow-lift"
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${a.tint} text-white shadow-md transition group-hover:scale-110`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold leading-tight text-ink">{a.label}</span>
                  <span className="block truncate text-xs text-slate-500">{a.hint}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <Tabs
        tabs={[
          { id: "overview", label: "Overview", badge: activeDispatches.length || undefined, content: overview },
          { id: "earnings", label: "Earnings", content: earnings },
          { id: "marketing", label: "QR & marketing", content: marketing },
          { id: "network", label: "Network", content: network },
        ]}
      />
    </div>
  );
}
