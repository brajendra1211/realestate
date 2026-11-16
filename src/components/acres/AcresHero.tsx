"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Search,
  MapPin,
  Building2,
  ChevronDown,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
  BadgeCheck,
} from "lucide-react";
import { CountUp, Float } from "@/components/ui/Motion";

type AcresHeroProps = {
  propertyCount: number;
  agentCount: number;
  cityCount: number;
  currentCityName?: string | null;
  cities: { slug: string; name: string }[];
};

type SearchTab = "BUY" | "RENT" | "NEW_LAUNCH" | "COMMERCIAL" | "PG" | "PROJECTS";

const TABS: { id: SearchTab; label: string; badge?: string }[] = [
  { id: "BUY", label: "Buy" },
  { id: "RENT", label: "Rent" },
  { id: "NEW_LAUNCH", label: "New Launch", badge: "New" },
  { id: "COMMERCIAL", label: "Commercial" },
  { id: "PG", label: "PG / Co-Living" },
  { id: "PROJECTS", label: "Projects" },
];

const POPULAR_METROS = ["Noida", "Gurgaon", "Delhi NCR", "Bengaluru", "Mumbai", "Hyderabad", "Pune"];

const QUICK_BROWSE_PILLS = [
  { label: "Rent in Noida", city: "Noida", type: "RENT" },
  { label: "Buy in Noida", city: "Noida", type: "BUY" },
  { label: "Commercial in Noida", city: "Noida", type: "COMMERCIAL" },
  { label: "Buy in Gurgaon", city: "Gurgaon", type: "BUY" },
  { label: "Rent in Bengaluru", city: "Bengaluru", type: "RENT" },
];


export function AcresHero({
  propertyCount,
  agentCount,
  cityCount,
  currentCityName,
  cities,
}: AcresHeroProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SearchTab>("RENT");
  const [selectedCategory, setSelectedCategory] = useState("ALL_RESIDENTIAL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState(currentCityName || "Noida");

  const handleTabSwitch = (tab: SearchTab) => {
    setActiveTab(tab);
    if (tab === "COMMERCIAL") setSelectedCategory("COMMERCIAL");
    else if (tab === "PG") setSelectedCategory("PG");
    else setSelectedCategory("ALL_RESIDENTIAL");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (selectedCity && selectedCity !== "All Cities") params.set("city", selectedCity);
    if (searchQuery.trim()) params.set("city", searchQuery.trim());

    if (activeTab === "BUY" || activeTab === "NEW_LAUNCH" || activeTab === "PROJECTS") {
      params.set("listingType", "SALE");
      if (activeTab === "NEW_LAUNCH") params.set("condition", "NEW_BOOKING");
    } else {
      params.set("listingType", "RENT");
    }

    if (selectedCategory === "APARTMENT") params.set("propertyType", "APARTMENT");
    else if (selectedCategory === "VILLA") params.set("propertyType", "VILLA");
    else if (selectedCategory === "COMMERCIAL") params.set("propertyType", "COMMERCIAL");
    else if (selectedCategory === "PG") params.set("propertyType", "PG");

    router.push(`/properties?${params.toString()}`);
  };

  const handleQuickPill = (city: string, type: string) => {
    const params = new URLSearchParams();
    params.set("city", city);
    if (type === "BUY") params.set("listingType", "SALE");
    else if (type === "RENT") params.set("listingType", "RENT");
    else if (type === "COMMERCIAL") {
      params.set("listingType", "RENT");
      params.set("propertyType", "COMMERCIAL");
    }
    router.push(`/properties?${params.toString()}`);
  };

  const selectCls =
    "w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50/80 py-3.5 pl-11 pr-9 text-sm font-semibold text-ink outline-none transition focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100 cursor-pointer";

  return (
    <section className="relative isolate overflow-hidden bg-brand-950 pb-24 pt-14 text-white sm:pb-32 sm:pt-20">
      {/* Background image + layered gradients */}
      <div
        className="absolute inset-0 -z-10 bg-cover bg-bottom"
        style={{ backgroundImage: "url('/brand/hero-home.svg')" }}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-950/70 via-brand-950/20 to-brand-950/60" />
      <div className="absolute inset-0 -z-10 bg-grid [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="absolute -left-32 top-10 -z-10 h-96 w-96 rounded-full bg-brand-500/30 blur-[120px] animate-blob" />
      <div className="absolute -right-24 top-40 -z-10 h-96 w-96 rounded-full bg-gold-400/20 blur-[120px] animate-blob animation-delay-4000" />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <div
            style={{ animationDuration: "0.6s", animationDelay: "0s" }}
            className="hero-in glass-dark inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 text-xs font-semibold"
          >
            <Sparkles className="h-3.5 w-3.5 text-gold-300" />
            <span>Zero-brokerage rentals</span>
            <span className="h-1 w-1 rounded-full bg-white/40" />
            <span>Admin-verified buying</span>
          </div>

          <h1
            style={{ animationDuration: "0.8s", animationDelay: "0.1s" }}
            className="hero-in font-display mt-6 text-4xl font-semibold leading-[1.05] sm:text-6xl lg:text-7xl"
          >
            Find a home that
            <br />
            <span className="text-gradient-gold italic">feels like yours.</span>
          </h1>

          <p
            style={{ animationDuration: "0.7s", animationDelay: "0.25s" }}
            className="hero-in mx-auto mt-5 max-w-xl text-base text-slate-300 sm:text-lg"
          >
            Rent directly from owners with no broker fees, or buy from a curated catalogue where every
            property is legally verified by our team.
          </p>
        </div>

        {/* Search console */}
        <div
          style={{ animationDuration: "0.9s", animationDelay: "0.35s" }}
          className="hero-in mx-auto mt-10 max-w-4xl rounded-[28px] border border-white/20 bg-white p-4 text-ink shadow-[0_40px_100px_-30px_rgba(0,0,0,0.6)] sm:p-5"
        >
          {/* Tabs with sliding indicator */}
          <div className="no-scrollbar mb-4 flex items-center gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabSwitch(tab.id)}
                  className={`relative shrink-0 cursor-pointer rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    active ? "text-white" : "text-slate-600 hover:text-ink"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="hero-tab"
                      className="absolute inset-0 rounded-xl bg-brand-600 shadow-md"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    {tab.label}
                    {tab.badge && (
                      <span className="rounded-full bg-gold-400 px-1.5 py-px text-[9px] font-black uppercase text-ink">
                        {tab.badge}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSearch} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1.6fr_auto]">
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600" />
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className={selectCls}>
                <option value="ALL_RESIDENTIAL">All Residential</option>
                <option value="APARTMENT">Flats / Apartments</option>
                <option value="VILLA">Villas &amp; Houses</option>
                <option value="COMMERCIAL">Commercial Spaces</option>
                <option value="PG">PG / Co-Living</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative">
              <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600" />
              <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className={selectCls}>
                {POPULAR_METROS.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
                {cities
                  .filter((c) => !POPULAR_METROS.includes(c.name))
                  .map((c) => (
                    <option key={c.slug} value={c.name}>
                      {c.name}
                    </option>
                  ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Locality, project or landmark"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-3.5 pl-11 pr-4 text-sm font-medium text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              className="shine inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-600/30"
            >
              <Search className="h-4 w-4" />
              Search
            </motion.button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500">Popular:</span>
            {QUICK_BROWSE_PILLS.map((pill) => (
              <button
                key={pill.label}
                type="button"
                onClick={() => handleQuickPill(pill.city, pill.type)}
                className="cursor-pointer rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
              >
                {pill.label}
              </button>
            ))}
            <Link
              href="/list-property/request"
              className="ml-auto hidden items-center gap-1 font-bold text-brand-700 hover:underline sm:inline-flex"
            >
              Post rental <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div
          style={{ animationDuration: "0.8s", animationDelay: "0.6s" }}
          className="hero-in mx-auto mt-10 grid max-w-3xl grid-cols-3 gap-3 sm:gap-6"
        >
          {[
            { n: propertyCount, s: "+", l: "Verified listings" },
            { n: agentCount, s: "+", l: "Channel partners" },
            { n: cityCount, s: "", l: "Cities live" },
          ].map((st) => (
            <div key={st.l} className="text-center">
              <div className="font-display text-3xl font-semibold sm:text-4xl">
                <CountUp to={st.n} suffix={st.s} />
              </div>
              <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-slate-400 sm:text-xs">
                {st.l}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating trust chips (desktop) */}
      <Float className="absolute left-[4%] top-[38%] hidden xl:block">
        <div className="glass-dark flex items-center gap-2 rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          RERA &amp; title checked
        </div>
      </Float>
      <Float className="absolute right-[4%] top-[48%] hidden xl:block" delay={1.5}>
        <div className="glass-dark flex items-center gap-2 rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold">
          <BadgeCheck className="h-5 w-5 text-gold-300" />
          0% brokerage on rent
        </div>
      </Float>
    </section>
  );
}
