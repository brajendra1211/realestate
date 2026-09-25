import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getSiteSettings } from "@/lib/site-settings";
import { getAllPartnersTargetProgress } from "@/lib/targetCycle";
import { updateGlobalTargetsAction } from "./actions";
import { PartnerTargetModal } from "./PartnerTargetModal";

type SearchParams = Promise<{
  search?: string;
  sortBy?: "lowest_first" | "highest_first" | "days_remaining";
  saved?: string;
  error?: string;
}>;

export default async function AdminTargetsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SUBADMIN")) {
    redirect("/login");
  }

  const { search, sortBy = "lowest_first", saved, error } = await searchParams;

  const [settings, partners] = await Promise.all([
    getSiteSettings(),
    getAllPartnersTargetProgress({
      search,
      sortBy: sortBy as "lowest_first" | "highest_first" | "days_remaining",
    }),
  ]);

  const defaultTargets = {
    days: settings.partnerTargetDays ?? 30,
    properties: settings.partnerTargetProperties ?? 20,
    directAgents: settings.partnerTargetSubPartners ?? 10,
    investors: settings.partnerTargetInvestors ?? 3,
  };

  return (
    <div className="px-4 py-8 sm:px-8 lg:px-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-700 mb-2 border border-blue-200">
            <span>🎯</span>
            Performance Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Channel Partner Targets
          </h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Set global 30-day targets, customize individual partner goals, and track under-performing partners.
          </p>
        </div>

        <Link
          href="/admin/agents"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-2xs hover:bg-slate-50 transition"
        >
          <span>← Back to Partners</span>
        </Link>
      </div>

      {/* Alert Notices */}
      {saved === "global" && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-fadeIn">
          <span>✓</span>
          <span>Global default targets updated successfully for all Channel Partners!</span>
        </div>
      )}
      {saved === "partner" && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-fadeIn">
          <span>✓</span>
          <span>Individual partner custom target saved successfully!</span>
        </div>
      )}
      {saved === "cycle_reset" && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs font-bold text-amber-800 flex items-center gap-2 animate-fadeIn">
          <span>↻</span>
          <span>Target cycle restarted for partner starting today!</span>
        </div>
      )}
      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs font-bold text-red-800 flex items-center gap-2 animate-fadeIn">
          <span>⚠️</span>
          <span>Could not perform operation. Please try again.</span>
        </div>
      )}

      {/* Section 1: Global Default Targets Card */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Platform Default
            </span>
            <h2 className="text-lg font-black text-slate-900">
              Global Partner Targets (Auto-applied to All Partners)
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              These default targets apply to every partner unless an individual override is configured below.
            </p>
          </div>
          <span className="self-start sm:self-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            Standard: 30 Days / 20 Props / 10 Partners / 3 Investors
          </span>
        </div>

        <form action={updateGlobalTargetsAction} className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Cycle Window (Days)
            </label>
            <input
              type="number"
              name="partnerTargetDays"
              min="1"
              max="365"
              defaultValue={defaultTargets.days}
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              1. Properties to List
            </label>
            <input
              type="number"
              name="partnerTargetProperties"
              min="1"
              defaultValue={defaultTargets.properties}
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              2. Downline Partners
            </label>
            <input
              type="number"
              name="partnerTargetSubPartners"
              min="0"
              defaultValue={defaultTargets.directAgents}
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              3. Investors Onboarded
            </label>
            <input
              type="number"
              name="partnerTargetInvestors"
              min="0"
              defaultValue={defaultTargets.investors}
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <button
              type="submit"
              className="w-full rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider py-3 shadow-md hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer"
            >
              Update Defaults
            </button>
          </div>
        </form>
      </div>

      {/* Section 2: Channel Partner Progress List (Lowest Achievement First) */}
      <div className="space-y-4">
        {/* Controls & Search */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span>Partner Achievement Tracking</span>
              <span className="rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-xs font-black">
                {partners.length}
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Sorted by default: <strong className="text-slate-700">Lowest target achieved first</strong> to immediately identify partners who need assistance.
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <form method="GET" className="relative">
              <input type="hidden" name="sortBy" value={sortBy} />
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Search partner, code, city..."
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 w-56 sm:w-64"
              />
              <button type="submit" className="absolute right-2.5 top-2 text-xs text-slate-400">
                🔍
              </button>
            </form>

            {/* Sorting Pills */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80 text-xs">
              <Link
                href={`/admin/targets?sortBy=lowest_first${search ? `&search=${encodeURIComponent(search)}` : ""}`}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  sortBy === "lowest_first"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="Lowest achievement rate first"
              >
                🔻 Lowest Progress (Default)
              </Link>

              <Link
                href={`/admin/targets?sortBy=highest_first${search ? `&search=${encodeURIComponent(search)}` : ""}`}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  sortBy === "highest_first"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                🔺 Highest First
              </Link>

              <Link
                href={`/admin/targets?sortBy=days_remaining${search ? `&search=${encodeURIComponent(search)}` : ""}`}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  sortBy === "days_remaining"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                ⏳ Expiring Soon
              </Link>
            </div>
          </div>
        </div>

        {/* Partners Cards */}
        {partners.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
            <p className="text-base font-bold text-slate-700">No Channel Partners found</p>
            <p className="text-xs text-slate-400 mt-1">
              {search ? "No partner matched your search query." : "Approved channel partners will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {partners.map((partner, index) => {
              const isUrgent = partner.percentages.overall < 30 && partner.daysRemaining <= 15;

              return (
                <div
                  key={partner.agentId}
                  className={`rounded-3xl border bg-white p-5 sm:p-6 shadow-xs transition hover:shadow-md ${
                    isUrgent ? "border-amber-300/80 bg-linear-to-r from-amber-50/20 to-white" : "border-slate-200/90"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Left: Partner identity & badges */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-[11px] font-black">
                          #{index + 1}
                        </span>

                        <h3 className="text-base font-black text-slate-900 truncate">
                          {partner.shopName ?? partner.userName}
                        </h3>

                        {partner.agentCode && (
                          <span className="rounded-lg bg-blue-50 px-2 py-0.5 font-mono text-xs font-bold text-blue-700 border border-blue-200">
                            {partner.agentCode}
                          </span>
                        )}

                        {partner.customTargetEnabled ? (
                          <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-extrabold text-purple-700 border border-purple-200">
                            ⚙️ Custom Target
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                            Global Default
                          </span>
                        )}

                        {/* Traffic light badge */}
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                            partner.trafficLight === "GREEN"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : partner.trafficLight === "YELLOW"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-red-50 text-red-800 border-red-200"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              partner.trafficLight === "GREEN"
                                ? "bg-emerald-500"
                                : partner.trafficLight === "YELLOW"
                                ? "bg-amber-500"
                                : "bg-red-500 animate-pulse"
                            }`}
                          />
                          {partner.trafficLight === "GREEN"
                            ? "Completed"
                            : partner.trafficLight === "YELLOW"
                            ? "In Progress"
                            : "Behind Target"}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
                        <span>👤 {partner.userName}</span>
                        {partner.userPhone && <span>📞 {partner.userPhone}</span>}
                        {partner.city && <span>📍 {partner.city}</span>}
                        <span className="text-slate-400">
                          ⏱️ {partner.daysRemaining} days left (Cycle: {partner.cycleDays}d)
                        </span>
                      </div>
                    </div>

                    {/* Right: Overall Progress Gauge & Set Target Button */}
                    <div className="flex items-center gap-4 self-start lg:self-auto">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                          Total Achieved
                        </span>
                        <p
                          className={`text-xl font-black ${
                            partner.percentages.overall >= 80
                              ? "text-emerald-600"
                              : partner.percentages.overall >= 40
                              ? "text-blue-600"
                              : "text-amber-600"
                          }`}
                        >
                          {partner.percentages.overall}%
                        </p>
                      </div>

                      <PartnerTargetModal partner={partner} defaultTargets={defaultTargets} />
                    </div>
                  </div>

                  {/* Overall Progress Bar */}
                  <div className="mt-4 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        partner.percentages.overall >= 80
                          ? "bg-emerald-500"
                          : partner.percentages.overall >= 40
                          ? "bg-blue-600"
                          : "bg-amber-500"
                      }`}
                      style={{ width: `${Math.max(4, partner.percentages.overall)}%` }}
                    />
                  </div>

                  {/* 3 Individual Target Cards */}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Target 1: Properties */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">1. Properties Listed</span>
                        <span className="font-black text-slate-900">
                          {partner.achieved.properties} / {partner.targets.properties}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span
                          className={`font-extrabold ${
                            partner.remaining.properties > 0 ? "text-amber-600" : "text-emerald-600"
                          }`}
                        >
                          {partner.remaining.properties > 0
                            ? `Bacha hua: ${partner.remaining.properties} remaining`
                            : "✓ Completed!"}
                        </span>
                        <span className="font-semibold text-slate-400">
                          {partner.percentages.properties}%
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${partner.percentages.properties}%` }}
                        />
                      </div>
                    </div>

                    {/* Target 2: Downline Partners */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">2. Downline Partners</span>
                        <span className="font-black text-slate-900">
                          {partner.achieved.directAgents} / {partner.targets.directAgents}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span
                          className={`font-extrabold ${
                            partner.remaining.directAgents > 0 ? "text-amber-600" : "text-emerald-600"
                          }`}
                        >
                          {partner.remaining.directAgents > 0
                            ? `Bacha hua: ${partner.remaining.directAgents} remaining`
                            : "✓ Completed!"}
                        </span>
                        <span className="font-semibold text-slate-400">
                          {partner.percentages.directAgents}%
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-indigo-600">
                        <div
                          className="h-full rounded-full bg-indigo-600"
                          style={{ width: `${partner.percentages.directAgents}%` }}
                        />
                      </div>
                    </div>

                    {/* Target 3: Investors */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">3. Investors Added</span>
                        <span className="font-black text-slate-900">
                          {partner.achieved.investors} / {partner.targets.investors}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span
                          className={`font-extrabold ${
                            partner.remaining.investors > 0 ? "text-amber-600" : "text-emerald-600"
                          }`}
                        >
                          {partner.remaining.investors > 0
                            ? `Bacha hua: ${partner.remaining.investors} remaining`
                            : "✓ Completed!"}
                        </span>
                        <span className="font-semibold text-slate-400">
                          {partner.percentages.investors}%
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-emerald-600">
                        <div
                          className="h-full rounded-full bg-emerald-600"
                          style={{ width: `${partner.percentages.investors}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
