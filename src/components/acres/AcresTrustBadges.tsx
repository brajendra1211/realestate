import Link from "next/link";

const PILLARS = [
  {
    title: "100% Vetted Listings",
    body: "Every property goes through official doc verification and site validation before publication. Zero phantom inventory.",
    badge: "Verified Trust",
    iconBg: "bg-emerald-600 text-white",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  },
  {
    title: "Instant Live Dispatch (<30s)",
    body: "Request site visits and get paired with the nearest certified channel partner in real time — no endless agent followups.",
    badge: "Under 30 Secs",
    iconBg: "bg-[#0054a6] text-white",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    ),
  },
  {
    title: "Master Deduplication",
    body: "Our centralized registry cross-checks title records so you never see the same property listed 5 times by random brokers.",
    badge: "Zero Spam",
    iconBg: "bg-amber-600 text-white",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-5 9l2 2 4-4" />
    ),
  },
  {
    title: "Authentic Deal Reviews",
    body: "Channel partner rankings and performance ratings are computed live from verified buyer feedback and registered deals.",
    badge: "Real Milestones",
    iconBg: "bg-purple-600 text-white",
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l2.6 6.5L21 9l-5 4.5L17.5 21 12 17.5 6.5 21 8 13.5 3 9l6.4-.5z" />
    ),
  },
];

export function AcresTrustBadges() {
  return (
    <section className="bg-white border-t border-slate-200 py-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-[#0054a6]">
            The 99acres Benchmark
          </span>
          <h2 className="mt-3 text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Why 10 Lakh+ Home Seekers Trust Us
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 font-medium">
            We eliminate broker spam, phantom listings, and fake photos through certified channel partner verification.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200 p-6 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-[#0054a6] hover:shadow-lg bg-white"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm ${p.iconBg}`}>
                    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                      {p.icon}
                    </svg>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                    {p.badge}
                  </span>
                </div>

                <h3 className="mt-5 text-base font-extrabold text-slate-900 group-hover:text-[#0054a6] transition">
                  {p.title}
                </h3>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed font-medium">
                  {p.body}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center text-xs font-bold text-[#0054a6]">
                <span>Learn more</span>
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-1">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
