import Link from "next/link";
import { ArrowUpRight, Building } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Stagger, StaggerItem } from "@/components/ui/Motion";

const CITIES = [
  { name: "Bengaluru", subtitle: "Silicon Valley of India", tag: "IT hub", tint: "from-sky-500 to-brand-600" },
  { name: "Mumbai", subtitle: "Financial capital", tag: "Sea-facing", tint: "from-rose-500 to-orange-500" },
  { name: "Delhi NCR", subtitle: "Gurugram & Noida", tag: "Expressways", tint: "from-violet-500 to-brand-600" },
  { name: "Pune", subtitle: "Oxford of the East", tag: "IT & auto", tint: "from-emerald-500 to-teal-600" },
  { name: "Hyderabad", subtitle: "Cyberabad corridor", tag: "Fast growing", tint: "from-cyan-500 to-sky-600" },
  { name: "Dubai", subtitle: "Global luxury hub", tag: "Tax-free", tint: "from-amber-500 to-gold-600" },
];

export function AcresTopCities() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Pan-India & global metros"
        title="Explore the top metro cities"
        subtitle="Verified owner rentals, gated communities and luxury residential projects across major hubs."
        href="/properties"
        hrefLabel="All cities"
      />

      <Stagger className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {CITIES.map((city) => (
          <StaggerItem key={city.name}>
            <Link
              href={`/properties?city=${encodeURIComponent(city.name)}`}
              className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:border-transparent hover:shadow-lift"
            >
              <div
                className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${city.tint} opacity-10 transition-all duration-500 group-hover:scale-150 group-hover:opacity-20`}
              />
              <div className="relative flex items-center justify-between">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${city.tint} text-white shadow-md`}>
                  <Building className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{city.tag}</span>
              </div>
              <div className="relative mt-6">
                <h3 className="text-lg font-bold text-ink">{city.name}</h3>
                <p className="text-xs text-slate-500">{city.subtitle}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-600">
                  Browse homes
                  <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
