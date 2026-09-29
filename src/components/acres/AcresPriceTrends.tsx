import Link from "next/link";

const TRENDS = [
  {
    locality: "Whitefield",
    city: "Bengaluru",
    avgPrice: 7850,
    growth: "+8.4%",
    type: "IT & Tech Corridor",
    href: "/properties?city=Bengaluru",
  },
  {
    locality: "Indiranagar",
    city: "Bengaluru",
    avgPrice: 14200,
    growth: "+11.2%",
    type: "Premium Residential",
    href: "/properties?city=Bengaluru",
  },
  {
    locality: "HSR Layout",
    city: "Bengaluru",
    avgPrice: 9900,
    growth: "+9.1%",
    type: "Startup & Retail Hub",
    href: "/properties?city=Bengaluru",
  },
  {
    locality: "Golf Course Road",
    city: "Gurugram",
    avgPrice: 18400,
    growth: "+14.3%",
    type: "Ultra-Luxury Condos",
    href: "/properties?city=Delhi",
  },
  {
    locality: "Bandra West",
    city: "Mumbai",
    avgPrice: 48500,
    growth: "+6.5%",
    type: "Sea-Facing Living",
    href: "/properties?city=Mumbai",
  },
  {
    locality: "Gachibowli",
    city: "Hyderabad",
    avgPrice: 8100,
    growth: "+10.5%",
    type: "Financial District",
    href: "/properties?city=Hyderabad",
  },
];

export function AcresPriceTrends() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-[#0054a6]">
            Market Intelligence
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight sm:text-3xl">
            Real Estate Rates & Price Trends
          </h2>
          <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500">
            Historical price trends and year-on-year capital appreciation in top micro-markets.
          </p>
        </div>

        <Link
          href="/properties"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#0054a6] hover:underline"
        >
          <span>View All Market Trends</span>
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 stroke-[2.5]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TRENDS.map((t) => (
          <Link
            key={t.locality}
            href={t.href}
            className="group flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs transition hover:border-[#0054a6] hover:shadow-md"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 group-hover:text-[#0054a6] transition">
                  {t.locality}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">({t.city})</span>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{t.type}</p>
              <div className="mt-2 text-base font-black text-slate-900">
                ₹ {t.avgPrice.toLocaleString("en-IN")}{" "}
                <span className="text-[11px] font-bold text-slate-400">/ sq.ft</span>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 stroke-[3]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                {t.growth}
              </span>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">YoY Rise</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
