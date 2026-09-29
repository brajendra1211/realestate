import Link from "next/link";

const CITIES = [
  {
    name: "Bengaluru",
    subtitle: "Silicon Valley of India",
    count: "3,500+ Properties",
    tag: "High IT Demand",
    color: "from-blue-600 to-indigo-700",
    bgEmoji: "🏙️",
  },
  {
    name: "Mumbai",
    subtitle: "Financial Capital",
    count: "2,800+ Properties",
    tag: "Sea-Facing Living",
    color: "from-sky-600 to-blue-800",
    bgEmoji: "🌊",
  },
  {
    name: "Delhi NCR",
    subtitle: "Gurugram & Noida",
    count: "4,100+ Properties",
    tag: "Expressways & Metro",
    color: "from-indigo-600 to-purple-800",
    bgEmoji: "🏛️",
  },
  {
    name: "Pune",
    subtitle: "Oxford of the East",
    count: "1,900+ Properties",
    tag: "IT & Auto Hub",
    color: "from-teal-600 to-emerald-800",
    bgEmoji: "🌳",
  },
  {
    name: "Hyderabad",
    subtitle: "Cyberabad Corridor",
    count: "2,200+ Properties",
    tag: "Fastest Growing",
    color: "from-cyan-600 to-blue-700",
    bgEmoji: "🏰",
  },
  {
    name: "Chennai",
    subtitle: "Industrial Gateway",
    count: "1,400+ Properties",
    tag: "Coastal Residential",
    color: "from-amber-600 to-orange-700",
    bgEmoji: "☀️",
  },
];

export function AcresTopCities() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-[#0054a6]">
            Pan-India Network
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight sm:text-3xl">
            Explore Real Estate in Top Indian Cities
          </h2>
          <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500">
            Find certified channel partners, gated communities, and luxury residential projects across major hubs.
          </p>
        </div>

        <Link
          href="/properties"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#0054a6] hover:underline"
        >
          <span>View All Cities</span>
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 stroke-[2.5]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {CITIES.map((city) => (
          <Link
            key={city.name}
            href={`/properties?city=${encodeURIComponent(city.name)}`}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-[#0054a6] hover:shadow-lg"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-2xl">{city.bgEmoji}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600">
                  {city.tag}
                </span>
              </div>

              <h3 className="mt-4 text-base font-extrabold text-slate-900 group-hover:text-[#0054a6] transition">
                {city.name}
              </h3>
              <p className="text-[11px] text-slate-400 font-semibold">{city.subtitle}</p>
            </div>

            <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#0054a6]">
                {city.count}
              </span>
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0054a6] transition-transform duration-200 group-hover:translate-x-1">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
