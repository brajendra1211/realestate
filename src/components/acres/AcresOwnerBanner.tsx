import Link from "next/link";

export function AcresOwnerBanner() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 pb-4">
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-amber-200/90 bg-gradient-to-r from-amber-50 via-white to-blue-50/50 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Left copy & highlights */}
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 border border-amber-400/40 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-amber-900">
              <span>🏠</span> Owner & Builder Corner
            </div>

            <h2 className="mt-2 text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Are you a Property Owner or Dealer? Sell or Rent with{" "}
              <span className="text-[#0054a6] underline decoration-amber-400 decoration-3 underline-offset-4">
                Zero Brokerage
              </span>
            </h2>

            <p className="mt-1.5 text-xs sm:text-sm text-slate-600 font-medium">
              List your flat, villa, plot or commercial unit in under 2 minutes and connect directly with verified buyers and tenants.
            </p>

            {/* 3 bullet checkmarks */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700">
              <div className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs">
                  ✓
                </span>
                <span>100% Genuine Inquiries</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs">
                  ✓
                </span>
                <span>Zero Broker Commission</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs">
                  ✓
                </span>
                <span>Instant QR Standee & Live Dispatch</span>
              </div>
            </div>
          </div>

          {/* Right CTA Button */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end gap-2.5 shrink-0">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl sm:rounded-2xl bg-[#0054a6] hover:bg-[#004080] px-6 py-3.5 text-xs sm:text-sm font-extrabold text-white shadow-md hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Post Your Property</span>
              <span className="rounded-full bg-emerald-500 text-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                FREE
              </span>
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 stroke-[2.5]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <span className="text-[11px] font-semibold text-slate-500">
              ⚡ Free listing • Instant activation
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
