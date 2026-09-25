import Link from "next/link";

type DeveloperItem = {
  id: string;
  name: string;
  slug: string;
  city?: string | null;
  logoUrl?: string | null;
  projectCount?: number;
};

const DEFAULT_BUILDERS = [
  {
    name: "Godrej Properties",
    slug: "godrej-properties",
    city: "Bengaluru & NCR",
    projects: "28+ Projects",
    abbr: "GP",
    color: "from-emerald-600 to-teal-700",
    badge: "Grade-A Eco Builder",
  },
  {
    name: "Prestige Group",
    slug: "prestige-group",
    city: "Bengaluru",
    projects: "42+ Projects",
    abbr: "PG",
    color: "from-blue-600 to-indigo-700",
    badge: "Landmark Developer",
  },
  {
    name: "Sobha Limited",
    slug: "sobha-limited",
    city: "Bengaluru",
    projects: "24+ Projects",
    abbr: "SL",
    color: "from-amber-600 to-orange-700",
    badge: "Precision German Tech",
  },
  {
    name: "Brigade Group",
    slug: "brigade-group",
    city: "Bengaluru",
    projects: "30+ Projects",
    abbr: "BG",
    color: "from-indigo-600 to-purple-700",
    badge: "Integrated Townships",
  },
  {
    name: "DLF Limited",
    slug: "dlf-limited",
    city: "NCR / Gurugram",
    projects: "35+ Projects",
    abbr: "DLF",
    color: "from-rose-600 to-pink-700",
    badge: "Ultra Luxury Estates",
  },
  {
    name: "Lodha Group",
    slug: "lodha-group",
    city: "Mumbai & NCR",
    projects: "38+ Projects",
    abbr: "LD",
    color: "from-purple-600 to-violet-700",
    badge: "Iconic Sky Residences",
  },
  {
    name: "Tata Housing",
    slug: "tata-housing",
    city: "Pan India",
    projects: "20+ Projects",
    abbr: "TH",
    color: "from-teal-600 to-emerald-700",
    badge: "Trust & Heritage",
  },
  {
    name: "Oberoi Realty",
    slug: "oberoi-realty",
    city: "Mumbai",
    projects: "16+ Projects",
    abbr: "OR",
    color: "from-amber-500 to-yellow-600",
    badge: "Contemporary Luxury",
  },
];

export function DevelopersMarquee({ dbDevelopers = [] }: { dbDevelopers?: DeveloperItem[] }) {
  // Merge DB developers with our curated premier list so the marquee is rich and continuous
  const list = [
    ...dbDevelopers.map((d) => ({
      name: d.name,
      slug: d.slug,
      city: d.city || "Prime Metros",
      projects: `${d.projectCount ?? 8}+ Projects`,
      abbr: d.name.slice(0, 2).toUpperCase(),
      color: "from-blue-600 to-indigo-700",
      badge: "Verified Developer",
    })),
    ...DEFAULT_BUILDERS,
  ];

  // Remove duplicates by slug
  const uniqueBuilders = Array.from(new Map(list.map((item) => [item.slug, item])).values());
  // Double the array for smooth, infinite marquee scrolling
  const marqueeList = [...uniqueBuilders, ...uniqueBuilders];

  return (
    <section className="relative overflow-hidden border-y border-slate-200/80 bg-linear-to-b from-white via-slate-50/50 to-white py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-linear-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-amber-500/25 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-amber-800">
              <span>🏗️</span> Authorized Builder Network
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl tracking-tight">
              Leading Real Estate Developers & Builders
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
              Explore flagship townships, premium high-rises, and commercial hubs from top-tier certified builders.
            </p>
          </div>

          <Link
            href="/developers"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-xs transition hover:bg-slate-50 hover:border-slate-300 shrink-0"
          >
            <span>View All Developers</span>
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-slate-500">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Marquee Track Container with Left and Right Fade Overlays */}
      <div className="relative w-full overflow-hidden">
        {/* Left Gradient Mask */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-16 sm:w-32 bg-linear-to-r from-white via-white/80 to-transparent" />
        {/* Right Gradient Mask */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-16 sm:w-32 bg-linear-to-l from-white via-white/80 to-transparent" />

        {/* Continuous Right-to-Left Scrolling Row */}
        <div className="group flex w-max gap-4 py-3 animate-marquee hover:[animation-play-state:paused]">
          {marqueeList.map((builder, index) => (
            <Link
              key={`${builder.slug}-${index}`}
              href={`/developers/${builder.slug}`}
              className="flex shrink-0 items-center gap-3.5 rounded-2xl border border-slate-200/90 bg-white px-5 py-3.5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-blue-400 hover:shadow-xl hover:shadow-slate-900/10 cursor-pointer min-w-[260px]"
            >
              {/* Builder Logo Icon */}
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br ${builder.color} text-sm font-black text-white shadow-md`}
              >
                {builder.abbr}
              </div>

              {/* Builder Details */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-sm font-extrabold text-slate-900 group-hover:text-blue-600 transition">
                    {builder.name}
                  </h3>
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-blue-600 shrink-0">
                    <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                  </svg>
                </div>

                <p className="mt-0.5 text-xs text-slate-500 font-medium truncate">
                  {builder.city} · <span className="font-semibold text-slate-700">{builder.projects}</span>
                </p>

                <span className="mt-1.5 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  {builder.badge}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
