import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDealHistory } from "@/lib/deal";
import { formatINR, PAYMENT_MODES, PAYMENT_MODE_LABELS } from "@/lib/format";
import { recordDealAction, distributeProfitAction } from "./actions";

type SearchParams = Promise<{
  tab?: string;
  saved?: string;
  error?: string;
  q?: string;
  filter?: string;
  prefillAgentId?: string;
  prefillPropertyId?: string;
  prefillInvestorId?: string;
}>;

const ERROR_MESSAGES: Record<string, string> = {
  validation: "Enter a valid amount or select all required fields.",
  noAgents: "Pick at least one channel partner for the deal.",
  buyerAgentNotFound: "Buyer channel partner not found.",
  sellerAgentNotFound: "Seller channel partner not found.",
  notFound: "Referral Partner or record not found.",
  propertyNotFound: "Selected property could not be found.",
  agentNotFound: "Selected Channel Partner could not be found.",
};

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-800 transition focus:border-blue-500 focus:bg-white focus:outline-none";
const selectClass = inputClass;

export default async function AdminDealsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const {
    tab = "hierarchy",
    saved,
    error,
    q,
    filter,
    prefillAgentId,
    prefillPropertyId,
    prefillInvestorId,
  } = await searchParams;

  const [
    agentsWithHierarchy,
    investors,
    deals,
    profitDistributions,
    saleProperties,
    commissionSummary,
  ] = await Promise.all([
    prisma.agentProfile.findMany({
      where: { agentCode: { not: null } },
      include: {
        user: { select: { name: true, phone: true, email: true } },
        assignedProperties: {
          select: { id: true, title: true, price: true, listingType: true, status: true, locality: true, city: true },
          orderBy: { createdAt: "desc" },
        },
        investors: {
          include: {
            user: { select: { name: true, phone: true } },
            profitDistributions: {
              select: { id: true, totalProfit: true, agentShare: true, investorShare: true, distributedAt: true },
              orderBy: { distributedAt: "desc" },
              take: 3,
            },
          },
        },
        dealsAsSellerAgent: {
          select: { id: true, dealValue: true, sellerCommission: true, propertyTitle: true, dealDate: true },
          orderBy: { dealDate: "desc" },
          take: 3,
        },
        dealsAsBuyerAgent: {
          select: { id: true, dealValue: true, buyerCommission: true, propertyTitle: true, dealDate: true },
          orderBy: { dealDate: "desc" },
          take: 3,
        },
        commissionEntries: {
          select: { id: true, amount: true, type: true, createdAt: true, note: true },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
      orderBy: { agentCode: "asc" },
    }),
    prisma.investorProfile.findMany({
      where: { feeStatus: "PAID" },
      select: {
        id: true,
        investorCode: true,
        user: { select: { name: true } },
        referringAgent: { select: { id: true, agentCode: true, user: { select: { name: true } } } },
      },
      orderBy: { investorCode: "asc" },
    }),
    getDealHistory(),
    prisma.profitDistribution.findMany({
      include: {
        investorProfile: { select: { investorCode: true, user: { select: { name: true } } } },
        agent: { select: { agentCode: true } },
      },
      orderBy: { distributedAt: "desc" },
      take: 50,
    }),
    prisma.property.findMany({
      where: { listingType: "SALE", status: "AVAILABLE" },
      select: { id: true, title: true, price: true, assignedAgentId: true, locality: true, city: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.commissionLedgerEntry.aggregate({
      _sum: { amount: true },
    }),
  ]);

  const totalDealVolume = deals.reduce((sum, d) => sum + d.dealValue, 0);
  const totalCommissionDistributed = commissionSummary._sum.amount ?? 0;
  const activeInvestorsCount = investors.length;
  const activeAgentsCount = agentsWithHierarchy.length;

  const query = q?.trim().toLowerCase();
  const filteredAgents = agentsWithHierarchy.filter((agent) => {
    if (query) {
      const matchName = agent.user.name?.toLowerCase().includes(query);
      const matchCode = agent.agentCode?.toLowerCase().includes(query);
      const matchPhone = agent.user.phone?.includes(query);
      const matchShop = agent.shopName?.toLowerCase().includes(query);
      if (!matchName && !matchCode && !matchPhone && !matchShop) return false;
    }
    if (filter === "properties") return agent.assignedProperties.length > 0;
    if (filter === "investors") return agent.investors.length > 0;
    if (filter === "wallet") return agent.walletBalance > 0;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-8 lg:p-10 space-y-8 font-sans">
      {/* 1. Header & Quick Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link href="/admin" className="text-xs font-bold text-blue-600 hover:underline">
              ← Console Overview
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-slate-500">Deals &amp; Commission Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Deals &amp; Network Hierarchy Hub
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
            Connected multi-level operations: Channel Partner ➔ Assigned Properties ➔ Sales &amp; Rentals ➔ Referral Partners.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link
            href="/admin/commissions"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-xs font-bold text-white transition shadow-sm"
          >
            <span>Open Full Commission Ledger →</span>
          </Link>
        </div>
      </div>

      {/* 2. Top Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Deal Volume (GMV)</span>
          <p className="mt-2 text-2xl font-black text-slate-900 tracking-tight">{formatINR(totalDealVolume)}</p>
          <p className="mt-0.5 text-xs text-slate-500">{deals.length} recorded transactions</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Commissions Paid</span>
          <p className="mt-2 text-2xl font-black text-emerald-700 tracking-tight">{formatINR(totalCommissionDistributed)}</p>
          <p className="mt-0.5 text-xs text-slate-500">Credited to partner wallets</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Channel Partners</span>
          <p className="mt-2 text-2xl font-black text-blue-700 tracking-tight">{activeAgentsCount}</p>
          <p className="mt-0.5 text-xs text-slate-500">Active Prime network</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Referral Partners</span>
          <p className="mt-2 text-2xl font-black text-purple-700 tracking-tight">{activeInvestorsCount}</p>
          <p className="mt-0.5 text-xs text-slate-500">35% deal profit partners</p>
        </div>
      </div>

      {/* 3. Alerts */}
      {saved === "deal" && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200/90 p-4 text-emerald-800 animate-fadeIn">
          <p className="font-bold flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-200 text-emerald-900 text-xs">✓</span>
            <span>Property Sale Deal Recorded!</span>
          </p>
          <p className="text-xs text-emerald-700 mt-0.5">
            1% brokerage credited to buyer and seller channel partners. Ledger updated.
          </p>
        </div>
      )}
      {saved === "profit" && (
        <div className="rounded-2xl bg-purple-50 border border-purple-200/90 p-4 text-purple-800 animate-fadeIn">
          <p className="font-bold flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-200 text-purple-900 text-xs">✓</span>
            <span>Referral Partner Profit Distributed!</span>
          </p>
          <p className="text-xs text-purple-700 mt-0.5">
            35% Referral Partner, 10% Referring Agent, 20% Company Renovation, 35% Company Treasury ledger lines saved.
          </p>
        </div>
      )}
      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200/90 p-4 text-red-800 animate-fadeIn">
          <p className="font-bold flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-200 text-red-900 text-xs">!</span>
            <span>Transaction Error</span>
          </p>
          <p className="text-xs text-red-700 mt-0.5">
            {ERROR_MESSAGES[error] ?? "Something went wrong. Please check inputs and try again."}
          </p>
        </div>
      )}

      {/* 4. Tab Navigation Bar */}
      <div className="flex border-b border-slate-200 gap-1 sm:gap-2">
        <Link
          href="/admin/deals?tab=hierarchy"
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition ${
            tab === "hierarchy"
              ? "border-blue-600 text-blue-700 bg-white rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Partner &amp; Deals Hierarchy Tree</span>
        </Link>

        <Link
          href="/admin/deals?tab=wizard"
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition ${
            tab === "wizard"
              ? "border-blue-600 text-blue-700 bg-white rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>One-Click Deal Execution Hub</span>
        </Link>

        <Link
          href="/admin/deals?tab=history"
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition ${
            tab === "history"
              ? "border-blue-600 text-blue-700 bg-white rounded-t-xl"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Closed Deal History ({deals.length})</span>
        </Link>
      </div>

      {/* =========================================================================
          TAB 1: PARTNER & DEALS HIERARCHY TREE
          Interactive Network Flow & Connected Operational Tree
          ========================================================================= */}
      {tab === "hierarchy" && (
        <div className="space-y-8">
          {/* A. System Operational Hierarchy Blueprint */}
          <div className="rounded-3xl border border-blue-200/90 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 p-6 sm:p-8 text-white shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-0.5 text-[11px] font-bold text-blue-200 border border-blue-400/30">
                  <span>System Architecture Blueprint</span>
                </span>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight mt-2 text-white">
                  Operational Hierarchy &amp; Money-Flow Network
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 font-normal mt-1 max-w-2xl">
                  Every asset, deal, and commission in Pronesto is strictly mapped through this 3-level parent-child hierarchy.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/admin/deals?tab=wizard"
                  className="rounded-xl bg-blue-500 hover:bg-blue-400 px-4 py-2 text-xs font-bold text-white transition shadow-sm"
                >
                  One-Click Deal Wizard →
                </Link>
                <Link
                  href="/admin/commissions"
                  className="rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 text-xs font-bold text-white transition"
                >
                  Master Ledger →
                </Link>
              </div>
            </div>

            {/* Visual 4-Stage Operational Flow Diagram */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
              {/* Stage 1 */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4.5 backdrop-blur-xs relative group hover:bg-white/10 transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-300">
                      1. Revenue Triggers
                    </span>
                  </div>
                  <h3 className="font-black text-sm text-white mt-1">Platform Inflows</h3>
                  <ul className="mt-2 text-xs text-slate-300 space-y-1">
                    <li>• Property Sold (B2B Close)</li>
                    <li>• Referral Partner Exit (Flip Profit)</li>
                    <li>• Referral Partner Joining (₹20,000)</li>
                    <li>• Contact Unlock &amp; Gold Plans</li>
                  </ul>
                </div>
                <div className="mt-3 text-[10px] text-blue-200 font-bold bg-white/5 rounded-lg px-2 py-1 border border-white/10">
                  Clean Verified Events
                </div>
              </div>

              {/* Stage 2 */}
              <div className="rounded-2xl border border-white/20 bg-blue-600/20 p-4.5 backdrop-blur-xs relative group hover:bg-blue-600/30 transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300">
                      2. Calculation Engine
                    </span>
                  </div>
                  <h3 className="font-black text-sm text-white mt-1">Rules &amp; Formulas</h3>
                  <ul className="mt-2 text-xs text-indigo-100 space-y-1">
                    <li>• 1% Buyer + 1% Seller CP</li>
                    <li>• 35% Inv · 10% CP · 55% Co</li>
                    <li>• 10% of ₹20k = ₹2,000 to CP</li>
                    <li>• 50/50 Lead Unlock split</li>
                  </ul>
                </div>
                <div className="mt-3 text-[10px] text-indigo-200 font-bold bg-white/5 rounded-lg px-2 py-1 border border-white/10">
                  Zero Platform Leakage
                </div>
              </div>

              {/* Stage 3 */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4.5 backdrop-blur-xs relative group hover:bg-white/10 transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-300">
                      3. Audit Ledger
                    </span>
                  </div>
                  <h3 className="font-black text-sm text-white mt-1">Commission Trail</h3>
                  <ul className="mt-2 text-xs text-slate-300 space-y-1">
                    <li>• BROKERAGE credits logged</li>
                    <li>• 4-line DEAL_PROFIT_SHARE</li>
                    <li>• REGISTRATION_REFERRAL</li>
                    <li>• Full Admin filter &amp; search</li>
                  </ul>
                </div>
                <div className="mt-3 text-[10px] text-purple-200 font-bold bg-white/5 rounded-lg px-2 py-1 border border-white/10">
                  /admin/commissions
                </div>
              </div>

              {/* Stage 4 */}
              <div className="rounded-2xl border border-white/10 bg-emerald-600/20 p-4.5 backdrop-blur-xs relative group hover:bg-emerald-600/30 transition flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                      4. Payout Settlement
                    </span>
                  </div>
                  <h3 className="font-black text-sm text-white mt-1">Wallets &amp; Reserves</h3>
                  <ul className="mt-2 text-xs text-emerald-100 space-y-1">
                    <li>• Partner Wallet (+credits)</li>
                    <li>• Referral Partner Portfolio (35%)</li>
                    <li>• Company Treasury (55%)</li>
                    <li>• Renovation Reserve</li>
                  </ul>
                </div>
                <div className="mt-3 text-[10px] text-emerald-200 font-bold bg-white/5 rounded-lg px-2 py-1 border border-white/10">
                  Net of 5% Sec 194H TDS
                </div>
              </div>
            </div>
          </div>

          {/* B. Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <form method="GET" action="/admin/deals" className="flex items-center gap-2 flex-1 max-w-md">
              <input type="hidden" name="tab" value="hierarchy" />
              {filter && <input type="hidden" name="filter" value={filter} />}
              <div className="relative w-full">
                <input
                  type="text"
                  name="q"
                  defaultValue={q ?? ""}
                  placeholder="Search Partner by name, code (e.g. NP-1001), or phone..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
                />
                <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
              </div>
              <button
                type="submit"
                className="rounded-xl bg-slate-900 hover:bg-slate-800 px-3.5 py-2 text-xs font-bold text-white transition shrink-0"
              >
                Search
              </button>
              {q && (
                <Link
                  href={`/admin/deals?tab=hierarchy${filter ? `&filter=${filter}` : ""}`}
                  className="text-xs font-bold text-slate-500 hover:text-red-600 shrink-0"
                >
                  Clear
                </Link>
              )}
            </form>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <Link
                href={`/admin/deals?tab=hierarchy${q ? `&q=${q}` : ""}`}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  !filter ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Partners ({agentsWithHierarchy.length})
              </Link>
              <Link
                href={`/admin/deals?tab=hierarchy&filter=properties${q ? `&q=${q}` : ""}`}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  filter === "properties" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                With Properties ({agentsWithHierarchy.filter((a) => a.assignedProperties.length > 0).length})
              </Link>
              <Link
                href={`/admin/deals?tab=hierarchy&filter=investors${q ? `&q=${q}` : ""}`}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  filter === "investors" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                With Referral Partners ({agentsWithHierarchy.filter((a) => a.investors.length > 0).length})
              </Link>
              <Link
                href={`/admin/deals?tab=hierarchy&filter=wallet${q ? `&q=${q}` : ""}`}
                className={`px-3 py-1.5 rounded-xl font-bold transition ${
                  filter === "wallet" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Wallet &gt; ₹0 ({agentsWithHierarchy.filter((a) => a.walletBalance > 0).length})
              </Link>
            </div>
          </div>

          {/* C. Partner Hierarchy Tree Nodes */}
          {filteredAgents.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <p className="text-base font-bold text-slate-700">No Channel Partners match the current filter.</p>
              <p className="text-xs text-slate-400 mt-1">Try resetting the search query or selecting &quot;All Partners&quot;.</p>
              <Link
                href="/admin/deals?tab=hierarchy"
                className="mt-4 inline-block rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition"
              >
                Reset Filters
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {filteredAgents.map((agent, index) => {
                const closedDealsCount = agent.dealsAsSellerAgent.length + agent.dealsAsBuyerAgent.length;
                const totalAgentDealsValue = [
                  ...agent.dealsAsSellerAgent,
                  ...agent.dealsAsBuyerAgent,
                ].reduce((sum, d) => sum + d.dealValue, 0);

                return (
                  <div
                    key={agent.id}
                    className="rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden transition hover:border-slate-300"
                  >
                    {/* Level 2: Parent Node Header */}
                    <div className="bg-slate-900 p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-13 w-13 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
                          {agent.user.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-md">
                              Level 2 Node #{index + 1}
                            </span>
                            <h3 className="font-black text-lg text-white">{agent.user.name}</h3>
                            <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-white text-slate-900 shadow-2xs">
                              {agent.agentCode}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                              ✓ Prime Verified
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1">
                            {agent.shopName ? `${agent.shopName} · ` : ""}
                            {agent.user.phone ?? "No phone"} · {agent.user.email}
                          </p>
                        </div>
                      </div>

                      {/* Parent Wallet & Direct Actions */}
                      <div className="flex flex-wrap items-center gap-4 self-start sm:self-auto border-t sm:border-t-0 border-white/10 pt-3 sm:pt-0">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Live Wallet Balance
                          </span>
                          <span className="font-black text-xl text-emerald-400">
                            {formatINR(agent.walletBalance)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/deals?tab=wizard&prefillAgentId=${agent.id}`}
                            className="rounded-xl bg-blue-600 hover:bg-blue-500 px-3.5 py-2 text-xs font-bold text-white transition shadow-sm"
                          >
                            ⚡ + Execute Deal
                          </Link>
                          <Link
                            href={`/admin/commissions?agentId=${agent.id}`}
                            className="rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-2 text-xs font-bold text-white transition"
                            title="Audit Ledger"
                          >
                            Ledger
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Quick Summary Pill Bar */}
                    <div className="bg-slate-50/80 px-6 py-2.5 border-b border-slate-100 flex flex-wrap items-center gap-3 sm:gap-6 text-xs text-slate-600 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span>{agent.assignedProperties.length} Managed Properties</span>
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span>{agent.investors.length} Referred Partners</span>
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{closedDealsCount} Closed Deals</span>
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="flex items-center gap-1.5 text-slate-900 font-bold">
                        <span>Volume:</span>
                        <span>{formatINR(totalAgentDealsValue)} GMV</span>
                      </span>
                    </div>

                    {/* Level 3: Connected Child Branches with Tree Line Indicators */}
                    <div className="p-5 sm:p-7">
                      <div className="border-l-2 border-indigo-200 ml-2 sm:ml-4 pl-4 sm:pl-6 space-y-6">
                        {/* Branch 3A: Assigned Inventory & Rental Auto-Brokerage */}
                        <div className="relative">
                          {/* Tree node indicator */}
                          <div className="absolute -left-[23px] sm:-left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-indigo-500 bg-white" />

                          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                    Branch 3A: Supply Inventory
                                  </span>
                                  <h4 className="font-bold text-sm text-slate-900">
                                    Assigned Properties ({agent.assignedProperties.length})
                                  </h4>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Properties managed by this partner. Sale deals credit 1% seller partner brokerage on closure.
                                </p>
                              </div>
                              <Link
                                href="/admin/properties"
                                className="text-xs font-bold text-blue-600 hover:underline self-start sm:self-auto"
                              >
                                Manage Inventory →
                              </Link>
                            </div>

                            {agent.assignedProperties.length === 0 ? (
                              <p className="text-xs text-slate-400 italic py-2">
                                No properties assigned to this partner yet. Go to Inventory to assign sale properties.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {agent.assignedProperties.map((prop) => (
                                  <div
                                    key={prop.id}
                                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs flex flex-col justify-between space-y-2 hover:bg-white hover:border-slate-300 transition"
                                  >
                                    <div>
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="font-bold text-slate-900 truncate flex-1" title={prop.title}>
                                          {prop.title}
                                        </span>
                                        <span
                                          className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                            prop.listingType === "RENT"
                                              ? "bg-blue-100 text-blue-800"
                                              : "bg-amber-100 text-amber-800"
                                          }`}
                                        >
                                          {prop.listingType}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between mt-1 text-slate-500 text-[11px]">
                                        <span>{prop.locality ? `${prop.locality}, ` : ""}{prop.city}</span>
                                        <span className="font-black text-slate-900">
                                          {formatINR(prop.price)}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="border-t border-slate-200/80 pt-2 flex items-center justify-between">
                                      <span
                                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                          prop.status === "RENTED"
                                            ? "bg-purple-100 text-purple-800"
                                            : prop.status === "SOLD"
                                            ? "bg-slate-900 text-white"
                                            : "bg-emerald-100 text-emerald-800"
                                        }`}
                                      >
                                        ● {prop.status}
                                      </span>

                                      {prop.listingType === "SALE" && prop.status === "AVAILABLE" && (
                                        <Link
                                          href={`/admin/deals?tab=wizard&prefillPropertyId=${prop.id}&prefillAgentId=${agent.id}`}
                                          className="text-[10px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md border border-blue-200 transition"
                                        >
                                          ⚡ Close Sale (1%+1%) →
                                        </Link>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Branch 3B: Referred Partner Network */}
                        <div className="relative">
                          {/* Tree node indicator */}
                          <div className="absolute -left-[23px] sm:-left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-purple-500 bg-white" />

                          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                                    Branch 3B: Referral Partner Network
                                  </span>
                                  <h4 className="font-bold text-sm text-slate-900">
                                    Referred Partners ({agent.investors.length})
                                  </h4>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Referral Partners referred by this agent code. Earns 10% on registration fee + 10% on every flip deal profit.
                                </p>
                              </div>
                              <Link
                                href="/admin/investors"
                                className="text-xs font-bold text-purple-600 hover:underline self-start sm:self-auto"
                              >
                                View All Referral Partners →
                              </Link>
                            </div>

                            {agent.investors.length === 0 ? (
                              <p className="text-xs text-slate-400 italic py-2">
                                No referral partners registered under {agent.agentCode} yet.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {agent.investors.map((inv) => (
                                  <div
                                    key={inv.id}
                                    className="rounded-xl border border-slate-200 bg-purple-50/30 p-3 text-xs flex flex-col justify-between space-y-2 hover:bg-white hover:border-purple-300 transition"
                                  >
                                    <div>
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-900">{inv.user.name}</span>
                                        <span className="font-mono text-[10px] font-black bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded border border-purple-200">
                                          {inv.investorCode ?? "Pending"}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-500 mt-0.5">{inv.user.phone ?? "No phone"}</p>
                                    </div>

                                    <div className="border-t border-purple-100 pt-2 flex items-center justify-between text-[11px]">
                                      <span className="text-slate-600 font-semibold">
                                        {inv.profitDistributions.length} profit cycle(s)
                                      </span>
                                      <Link
                                        href={`/admin/deals?tab=wizard&prefillInvestorId=${inv.id}`}
                                        className="text-[10px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-md border border-purple-200 transition"
                                      >
                                        Run 35/10/55 Split →
                                      </Link>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Branch 3C: Closed Deals & Wallet Audit Trail */}
                        <div className="relative">
                          {/* Tree node indicator */}
                          <div className="absolute -left-[23px] sm:-left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 border-emerald-500 bg-white" />

                          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                    Branch 3C: Wallet &amp; Ledger
                                  </span>
                                  <h4 className="font-bold text-sm text-slate-900">
                                    Earnings &amp; Deal Closures ({closedDealsCount} Deals)
                                  </h4>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  Realized brokerage and split records credited directly to this partner&apos;s wallet.
                                </p>
                              </div>
                              <Link
                                href={`/admin/commissions?agentId=${agent.id}`}
                                className="text-xs font-bold text-emerald-700 hover:underline self-start sm:self-auto"
                              >
                                View Complete Ledger ({agent.commissionEntries.length}) →
                              </Link>
                            </div>

                            {agent.commissionEntries.length === 0 ? (
                              <p className="text-xs text-slate-400 italic py-2">
                                No commission transactions recorded for this partner yet.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                {agent.commissionEntries.map((c) => (
                                  <div
                                    key={c.id}
                                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-xs flex items-center justify-between"
                                  >
                                    <div className="truncate flex-1 pr-2">
                                      <p className="font-bold text-slate-800 text-[11px] truncate">
                                        {c.note || c.type}
                                      </p>
                                      <span className="text-[9px] text-slate-400">
                                        {c.createdAt.toLocaleDateString("en-IN")} · {c.type}
                                      </span>
                                    </div>
                                    <span className="font-black text-emerald-700 text-xs shrink-0">
                                      +{formatINR(c.amount)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: ONE-CLICK DEAL EXECUTION WIZARD
          Clear, structured cards for Sales, Rentals, and Profit Shares
          ========================================================================= */}
      {tab === "wizard" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              One-Click Deal Execution Wizard
            </h2>
            <p className="text-xs text-slate-500">
              Select transaction category to calculate and disburse commissions automatically into partner wallets.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form 1: Property Sale (1% + 1% Brokerage) */}
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-black text-base text-slate-900">1. Property Sale Deal</h3>
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-black text-blue-700 border border-blue-200/80">
                    1% + 1%
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  1% to Buyer&apos;s Channel Partner, 1% to Seller&apos;s Partner. Credited 100% to agent wallets with zero platform deduction.
                </p>

                <form action={recordDealAction} className="space-y-3.5">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Live Sale Property (Optional selection)
                    </label>
                    <select
                      className={selectClass}
                      defaultValue=""
                    >
                      <option value="">— Choose from Available Inventory (or type deal value below) —</option>
                      {saleProperties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} · {formatINR(p.price)} ({p.city})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Total Deal Value (₹) *
                    </label>
                    <input type="number" name="dealValue" min={1} required placeholder="e.g. 10000000 (1 Crore)" className={inputClass} />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Buyer&apos;s Channel Partner (1%)
                    </label>
                    <select name="buyerAgentId" defaultValue={prefillAgentId ?? ""} className={selectClass}>
                      <option value="">— None (Direct Buyer) —</option>
                      {agentsWithHierarchy.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.agentCode} · {agent.user.name} ({agent.shopName ?? "Partner"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Seller&apos;s Channel Partner (1%)
                    </label>
                    <select name="sellerAgentId" defaultValue="" className={selectClass}>
                      <option value="">— None (Direct Owner) —</option>
                      {agentsWithHierarchy.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.agentCode} · {agent.user.name} ({agent.shopName ?? "Partner"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Payment Mode</label>
                    <select name="paymentMode" defaultValue="BANK_TRANSFER" className={selectClass}>
                      {PAYMENT_MODES.map((mode) => (
                        <option key={mode} value={mode}>
                          {PAYMENT_MODE_LABELS[mode]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Deal Notes (optional)</label>
                    <input type="text" name="note" placeholder="Registry / Agreement Ref No." className={inputClass} />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-2.5 text-xs font-bold text-white transition shadow-sm cursor-pointer mt-2"
                  >
                    Compute &amp; Disburse Sale Brokerage
                  </button>
                </form>
              </div>
            </div>

            {/* Form 2: Referral Partner Joint Venture Profit (35/10/20/35) */}
            <div className="rounded-3xl border border-purple-200 bg-white p-6 shadow-xs flex flex-col justify-between border-t-4 border-t-purple-600">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-black text-base text-slate-900">2. Joint Venture Profit</h3>
                  <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-black text-purple-700 border border-purple-200/80">
                    35 / 10 / 55
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  35% Referral Partner, 10% Referring Agent (Agent Code), 55% Company Treasury — supports multiple referral partners per deal with automatic agent mapping.
                </p>

                <form action={distributeProfitAction} className="space-y-3.5">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Referral Partner *
                    </label>
                    <select
                      name="investorProfileId"
                      required
                      defaultValue={prefillInvestorId ?? ""}
                      className={selectClass}
                    >
                      <option value="">— Select Verified Referral Partner —</option>
                      {investors.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.investorCode} · {inv.user.name} (Agent: {inv.referringAgent?.agentCode ?? "Direct"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Total Realized Profit Pool (₹) *
                    </label>
                    <input
                      type="number"
                      name="totalProfit"
                      min={1}
                      required
                      placeholder="e.g. 500000 (5 Lakh)"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Customer / Deal Reference ID
                    </label>
                    <input
                      type="text"
                      name="customerTransactionRef"
                      placeholder="e.g. DEAL-SECTOR-74-UNIT-302"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Payment Mode</label>
                    <select name="paymentMode" defaultValue="BANK_TRANSFER" className={selectClass}>
                      {PAYMENT_MODES.map((mode) => (
                        <option key={mode} value={mode}>
                          {PAYMENT_MODE_LABELS[mode]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Cycle Note</label>
                    <input type="text" name="note" placeholder="Q4 Joint Deal Cycle" className={inputClass} />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-purple-700 hover:bg-purple-800 py-2.5 text-xs font-bold text-white transition shadow-sm cursor-pointer mt-2"
                  >
                    Compute &amp; Distribute 4-Way Profit
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: CLOSED DEAL HISTORY & AUDIT TABLES
          ========================================================================= */}
      {tab === "history" && (
        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Closed Brokerage Deals History
            </h2>
            <p className="text-xs text-slate-500">
              Audit log of all property sales and rental deals executed across the platform.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Deal Details</th>
                  <th className="px-4 py-3">Deal Value</th>
                  <th className="px-4 py-3">Buyer Partner</th>
                  <th className="px-4 py-3">Seller / Rental Partner</th>
                  <th className="px-4 py-3">Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No deals recorded yet.
                    </td>
                  </tr>
                ) : (
                  deals.map((deal) => (
                    <tr key={deal.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-medium">
                        {deal.dealDate.toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-slate-800 font-bold max-w-xs truncate" title={deal.propertyTitle || deal.note || "Deal"}>
                        {deal.propertyTitle || deal.note || "Direct Deal"}
                      </td>
                      <td className="px-4 py-3 font-black text-slate-900 whitespace-nowrap">
                        {formatINR(deal.dealValue)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {deal.buyerAgent ? (
                          <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {deal.buyerAgent.agentCode} ({formatINR(deal.buyerCommission ?? 0)})
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {deal.sellerAgent ? (
                          <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            {deal.sellerAgent.agentCode} ({formatINR(deal.sellerCommission ?? 0)})
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {PAYMENT_MODE_LABELS[deal.paymentMode]}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Referral Partner Joint Profit Distributions
            </h2>
            <p className="text-xs text-slate-500">
              4-way breakdown: 35% Referral Partner, 10% Referring Agent, 20% Company Renovation, 35% Company Treasury.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Referral Partner</th>
                  <th className="px-4 py-3">Profit Pool</th>
                  <th className="px-4 py-3">Agent (10%)</th>
                  <th className="px-4 py-3">Renovation (20%)</th>
                  <th className="px-4 py-3">Referral Partner (35%)</th>
                  <th className="px-4 py-3">Company (35%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profitDistributions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No profit distributions recorded yet.
                    </td>
                  </tr>
                ) : (
                  profitDistributions.map((dist) => (
                    <tr key={dist.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-medium">
                        {dist.distributedAt.toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                        {dist.investorProfile.investorCode ?? dist.investorProfile.user?.name ?? "Referral Partner"}
                      </td>
                      <td className="px-4 py-3 font-black text-slate-900 whitespace-nowrap">
                        {formatINR(dist.totalProfit)}
                      </td>
                      <td className="px-4 py-3 text-blue-700 font-bold whitespace-nowrap">
                        +{formatINR(dist.agentShare)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {formatINR(dist.expenseShare)}
                      </td>
                      <td className="px-4 py-3 text-purple-700 font-bold whitespace-nowrap">
                        +{formatINR(dist.investorShare)}
                      </td>
                      <td className="px-4 py-3 text-emerald-700 font-bold whitespace-nowrap">
                        +{formatINR(dist.companyShare)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
