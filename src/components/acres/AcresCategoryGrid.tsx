import Link from "next/link";

const CATEGORIES = [
  {
    title: "Buy a Home",
    subtitle: "Flats, Villas, Penthouses",
    href: "/properties?listingType=SALE",
    badge: "5,000+ Properties",
    bgColor: "bg-blue-50/70 border-blue-200/80 hover:border-blue-400",
    iconBg: "bg-[#0054a6] text-white",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    ),
  },
  {
    title: "Rent a Home",
    subtitle: "Furnished, No Brokerage, Flats",
    href: "/properties?listingType=RENT",
    badge: "Verified Owners",
    bgColor: "bg-emerald-50/70 border-emerald-200/80 hover:border-emerald-400",
    iconBg: "bg-emerald-600 text-white",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
      />
    ),
  },
  {
    title: "New Projects",
    subtitle: "RERA Approved, Top Builders",
    href: "/projects",
    badge: "New Launches",
    bgColor: "bg-indigo-50/70 border-indigo-200/80 hover:border-indigo-400",
    iconBg: "bg-indigo-600 text-white",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    ),
  },
  {
    title: "Commercial Spaces",
    subtitle: "Offices, Retail, Showrooms",
    href: "/properties?propertyType=COMMERCIAL",
    badge: "High ROI Assets",
    bgColor: "bg-amber-50/70 border-amber-200/80 hover:border-amber-400",
    iconBg: "bg-amber-600 text-white",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    ),
  },
  {
    title: "Plots & Land",
    subtitle: "Residential, Farmhouse, Layouts",
    href: "/properties?propertyType=PLOT",
    badge: "Clear Title",
    bgColor: "bg-teal-50/70 border-teal-200/80 hover:border-teal-400",
    iconBg: "bg-teal-600 text-white",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
      />
    ),
  },
  {
    title: "Channel Partners",
    subtitle: "Prime Agents & QR Standees",
    href: "/dealers",
    badge: "100% Vetted",
    bgColor: "bg-purple-50/70 border-purple-200/80 hover:border-purple-400",
    iconBg: "bg-purple-600 text-white",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    ),
  },
];

export function AcresCategoryGrid() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200/80 pb-4">
        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-[#0054a6]">
            Explore by Category
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight sm:text-3xl">
            Popular Real Estate Choices
          </h2>
        </div>
        <p className="text-xs sm:text-sm font-medium text-slate-500">
          Handpicked inventory tailored for every requirement and budget.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.title}
            href={cat.href}
            className={`group flex flex-col justify-between rounded-2xl border p-4 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${cat.bgColor}`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-xs transition duration-300 group-hover:scale-110 ${cat.iconBg}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    {cat.icon}
                  </svg>
                </div>
              </div>

              <h3 className="mt-3.5 text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-[#0054a6] transition">
                {cat.title}
              </h3>
              <p className="mt-1 text-[11px] font-semibold text-slate-500 leading-tight">
                {cat.subtitle}
              </p>
            </div>

            <div className="mt-4 pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-600">
                {cat.badge}
              </span>
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-[#0054a6] transition-transform duration-200 group-hover:translate-x-1">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
