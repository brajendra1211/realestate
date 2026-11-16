import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getAllAgentsPrimeExpiryStatus } from "@/lib/agentPlans";
import { getSiteSettings } from "@/lib/site-settings";
import { RenewPrimeButton } from "./RenewPrimeButton";

type SearchParams = Promise<{
  filter?: "all" | "expired" | "critical" | "active";
  search?: string;
  sortBy?: "expiring_first" | "latest_first" | "wallet_asc";
  saved?: string;
  error?: string;
}>;

export default async function AdminPrimeExpiryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUBADMIN")) {
    redirect("/login");
  }

  const { filter = "all", search, sortBy = "expiring_first", saved, error } = await searchParams;

  const allItems = await getAllAgentsPrimeExpiryStatus();
  const partners = await getAllAgentsPrimeExpiryStatus({
    filter: filter as "all" | "expired" | "critical" | "active",
    search,
    sortBy: sortBy as "expiring_first" | "latest_first" | "wallet_asc",
  });
  const { siteName } = await getSiteSettings();

  // Calculate metrics
  const expiredCount = allItems.filter((i) => i.status === "EXPIRED" || i.status === "INACTIVE").length;
  const criticalCount = allItems.filter((i) => i.status === "CRITICAL").length;
  const soonCount = allItems.filter((i) => i.status === "EXPIRING_SOON").length;
  const activeCount = allItems.filter((i) => i.status === "ACTIVE").length;

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10 space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-amber-800 mb-2 border border-amber-200">
            <span>⚡</span>
            Prime Membership Lifecycle
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Channel Partner Prime Expiry Tracker
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Monitor upcoming Prime renewals, prevent visibility pushback, and reactivate expiring partner accounts.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/admin/billing"
            className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-2xs hover:bg-slate-50 transition"
          >
            Billing Auto-Debit
          </Link>
          <Link
            href="/admin/agents"
            className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-2xs hover:bg-slate-50 transition"
          >
            All Partners
          </Link>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {saved === "renewed" && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-fadeIn">
          <span>✓</span>
          <span>Channel Partner Prime plan renewed successfully for 30 days! Visibility restored.</span>
        </div>
      )}
      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs font-bold text-red-800 flex items-center gap-2 animate-fadeIn">
          <span>⚠️</span>
          <span>Could not complete renewal: {error}</span>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-3xl border border-red-200 bg-linear-to-br from-red-50/70 to-white p-5 shadow-2xs">
          <span className="text-[11px] font-black uppercase tracking-wider text-red-600">
            Expired / Demoted
          </span>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-red-700">{expiredCount}</p>
          <p className="mt-1 text-[11px] text-red-600/80 font-medium">
            Listings pushed to bottom, leads paused
          </p>
        </div>

        <div className="rounded-3xl border border-amber-200 bg-linear-to-br from-amber-50/70 to-white p-5 shadow-2xs">
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-700">
            Critical (≤ 5 Days Left)
          </span>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-amber-800">{criticalCount}</p>
          <p className="mt-1 text-[11px] text-amber-700/80 font-medium">
            Urgent renewal alert sent to partner
          </p>
        </div>

        <div className="rounded-3xl border border-blue-200 bg-linear-to-br from-blue-50/60 to-white p-5 shadow-2xs">
          <span className="text-[11px] font-black uppercase tracking-wider text-blue-700">
            Expiring in 6-15 Days
          </span>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-blue-800">{soonCount}</p>
          <p className="mt-1 text-[11px] text-blue-600 font-medium">
            Approaching renewal cycle
          </p>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-linear-to-br from-emerald-50/60 to-white p-5 shadow-2xs">
          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
            Active & Safe (&gt; 15 Days)
          </span>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-emerald-800">{activeCount}</p>
          <p className="mt-1 text-[11px] text-emerald-600 font-medium">
            Prime verified with full priority
          </p>
        </div>
      </div>

      {/* Filter Tabs, Search & Sort Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          <Link
            href={`/admin/prime-expiry?filter=all&sortBy=${sortBy}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
            className={`rounded-xl px-3.5 py-2 transition ${
              filter === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            All Partners ({allItems.length})
          </Link>

          <Link
            href={`/admin/prime-expiry?filter=expired&sortBy=${sortBy}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition ${
              filter === "expired"
                ? "bg-red-600 text-white shadow-xs"
                : "bg-white text-red-700 border border-red-200 hover:bg-red-50"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span>Expired ({expiredCount})</span>
          </Link>

          <Link
            href={`/admin/prime-expiry?filter=critical&sortBy=${sortBy}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition ${
              filter === "critical"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-white text-amber-800 border border-amber-200 hover:bg-amber-50"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>Critical ≤ 5 Days ({criticalCount})</span>
          </Link>

          <Link
            href={`/admin/prime-expiry?filter=active&sortBy=${sortBy}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition ${
              filter === "active"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Active ({activeCount + soonCount})</span>
          </Link>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <form method="GET" className="relative">
            <input type="hidden" name="filter" value={filter} />
            <input type="hidden" name="sortBy" value={sortBy} />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search partner, code, phone..."
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 w-52 sm:w-60"
            />
            <button type="submit" className="absolute right-2.5 top-2.5 text-xs text-slate-400">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>

          {/* Sort Menu */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80 text-xs">
            <Link
              href={`/admin/prime-expiry?filter=${filter}&sortBy=expiring_first${search ? `&search=${encodeURIComponent(search)}` : ""}`}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                sortBy === "expiring_first"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title="Whoever is expiring soonest comes first"
            >
              Expiring Soonest First (Default)
            </Link>

            <Link
              href={`/admin/prime-expiry?filter=${filter}&sortBy=wallet_asc${search ? `&search=${encodeURIComponent(search)}` : ""}`}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                sortBy === "wallet_asc"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title="Lowest wallet balance first"
            >
              Lowest Wallet
            </Link>
          </div>
        </div>
      </div>

      {/* Main List */}
      {partners.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          <p className="text-base font-bold text-slate-700">No Channel Partners found</p>
          <p className="text-xs text-slate-400 mt-1">
            {search ? "No partner matches your search query." : "Try switching filters to view all partners."}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {partners.map((partner, index) => {
            const isExpired = partner.status === "EXPIRED" || partner.daysRemaining <= 0;
            const isCritical = partner.status === "CRITICAL" && partner.daysRemaining > 0;
            const cleanPhone = partner.phone?.replace(/[^0-9]/g, "") ?? "";
            const whatsappMsg = encodeURIComponent(
              `Hello ${partner.name}, your ${siteName} Channel Partner Prime membership (${partner.agentCode ?? ""}) ${
                isExpired ? "has expired" : `expires in ${partner.daysRemaining} days`
              }. Please renew to maintain exclusive buyer lead dispatch and active listing visibility.`
            );

            return (
              <div
                key={partner.agentId}
                className={`rounded-3xl border bg-white p-5 sm:p-6 shadow-xs transition hover:shadow-md ${
                  isExpired
                    ? "border-red-300 bg-linear-to-r from-red-50/25 via-white to-white"
                    : isCritical
                    ? "border-amber-300 bg-linear-to-r from-amber-50/25 via-white to-white"
                    : "border-slate-200/90"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Left: Partner identity & Expiry countdown */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-[11px] font-black">
                        #{index + 1}
                      </span>

                      <h3 className="text-base font-black text-slate-900 truncate">
                        {partner.shopName ?? partner.name}
                      </h3>

                      {partner.agentCode && (
                        <span className="rounded-lg bg-blue-50 px-2 py-0.5 font-mono text-xs font-bold text-blue-700 border border-blue-200">
                          {partner.agentCode}
                        </span>
                      )}

                      {/* Expiry Badge */}
                      {isExpired ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-300 px-3 py-0.5 text-xs font-black text-red-800 animate-pulse">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
                          <span>Expired / Demoted</span>
                        </span>
                      ) : isCritical ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-3 py-0.5 text-xs font-black text-amber-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                          <span>Expires in {partner.daysRemaining} Day{partner.daysRemaining === 1 ? "" : "s"}!</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-3 py-0.5 text-xs font-bold text-emerald-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                          <span>Active ({partner.daysRemaining} Days Left)</span>
                        </span>
                      )}

                      {partner.visibilityDeprioritized && (
                        <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-black text-red-700 border border-red-200">
                          Demoted Visibility
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                      <span>{partner.name}</span>
                      {partner.phone && (
                        <span className="font-semibold text-slate-700">· {partner.phone}</span>
                      )}
                      {partner.city && <span>· {partner.city}</span>}
                      {partner.expiryDate && (
                        <span className="text-slate-400">
                          · Expiry: {new Date(partner.expiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle: Wallet & Auto-Pay Status */}
                  <div className="flex flex-wrap items-center gap-4 bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Wallet Balance</span>
                      <p className="font-mono font-black text-slate-900 text-sm">
                        ₹{partner.walletBalance.toLocaleString("en-IN")}
                      </p>
                      {partner.walletBalance < (partner.planPrice ?? 2000) && (
                        <p className="text-[10px] font-bold text-red-600 mt-0.5">
                          Low for auto-debit (₹{partner.planPrice ?? 2000})
                        </p>
                      )}
                    </div>

                    <div className="border-l border-slate-200 pl-3">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Auto-Pay Mandate</span>
                      <p className="font-bold text-slate-800 mt-0.5">
                        {partner.autoPayActive ? (
                          <span className="text-emerald-700 flex items-center gap-1 font-extrabold">
                            <span>✓</span>
                            <span>UPI Mandate Active</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">Not Configured</span>
                        )}
                      </p>
                      {partner.autoPayMandate && (
                        <p className="text-[10px] font-mono text-slate-500 truncate max-w-[130px]">
                          {partner.autoPayMandate}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Quick Action Buttons */}
                  <div className="flex items-center gap-2 self-start lg:self-auto">
                    {/* Direct WhatsApp Reminder */}
                    {cleanPhone && (
                      <a
                        href={`https://wa.me/91${cleanPhone}?text=${whatsappMsg}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] px-3.5 py-2.5 text-xs font-black text-white shadow-2xs transition cursor-pointer"
                        title="Send WhatsApp renewal reminder"
                      >
                        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824z" />
                        </svg>
                        <span>WhatsApp Reminder</span>
                      </a>
                    )}

                    {/* Admin Renew Prime Button */}
                    <RenewPrimeButton agentId={partner.agentId} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
