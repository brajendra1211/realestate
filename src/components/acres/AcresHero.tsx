"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AcresHeroProps = {
  propertyCount: number;
  agentCount: number;
  cityCount: number;
  currentCityName?: string | null;
  cities: { slug: string; name: string }[];
};

type TabType = "BUY" | "RENT" | "PROJECTS" | "COMMERCIAL" | "PLOT";

const TABS: { id: TabType; label: string; icon: string }[] = [
  { id: "BUY", label: "Buy", icon: "🏡" },
  { id: "RENT", label: "Rent", icon: "🔑" },
  { id: "PROJECTS", label: "New Projects", icon: "🏗️" },
  { id: "COMMERCIAL", label: "Commercial", icon: "🏢" },
  { id: "PLOT", label: "Plots / Land", icon: "📐" },
];

const POPULAR_LOCALITIES = [
  "Sector 43",
  "Sector 128",
  "Sector 137",
  "Sector 124",
  "Greater Noida West",
  "Expressway",
];

export function AcresHero({
  propertyCount,
  agentCount,
  cityCount,
  currentCityName,
  cities,
}: AcresHeroProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("BUY");
  const [selectedCity, setSelectedCity] = useState(currentCityName || "Noida");
  const [query, setQuery] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [budget, setBudget] = useState("");
  const [bedrooms, setBedrooms] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === "PROJECTS") {
      const params = new URLSearchParams();
      if (selectedCity) params.set("city", selectedCity);
      if (query.trim()) params.set("q", query.trim());
      router.push(`/projects?${params.toString()}`);
      return;
    }

    const params = new URLSearchParams();
    if (selectedCity) params.set("city", selectedCity);
    if (query.trim()) params.set("city", query.trim());

    if (activeTab === "BUY") {
      params.set("listingType", "SALE");
    } else if (activeTab === "RENT") {
      params.set("listingType", "RENT");
    } else if (activeTab === "COMMERCIAL") {
      params.set("propertyType", "COMMERCIAL");
    } else if (activeTab === "PLOT") {
      params.set("propertyType", "PLOT");
    }

    if (propertyType && activeTab !== "COMMERCIAL" && activeTab !== "PLOT") {
      params.set("propertyType", propertyType);
    }

    if (bedrooms && (activeTab === "BUY" || activeTab === "RENT")) {
      params.set("bedrooms", bedrooms);
    }

    if (budget) {
      if (budget === "under_50l") {
        params.set("maxPrice", "5000000");
      } else if (budget === "50l_1cr") {
        params.set("minPrice", "5000000");
        params.set("maxPrice", "10000000");
      } else if (budget === "1cr_2cr") {
        params.set("minPrice", "10000000");
        params.set("maxPrice", "20000000");
      } else if (budget === "2cr_5cr") {
        params.set("minPrice", "20000000");
        params.set("maxPrice", "50000000");
      } else if (budget === "above_5cr") {
        params.set("minPrice", "50000000");
      }
    }

    router.push(`/properties?${params.toString()}`);
  };

  const handleQuickLocality = (loc: string) => {
    const params = new URLSearchParams();
    params.set("city", loc);
    if (activeTab === "BUY") params.set("listingType", "SALE");
    if (activeTab === "RENT") params.set("listingType", "RENT");
    router.push(`/properties?${params.toString()}`);
  };

  return (
    <section className="relative overflow-hidden bg-slate-950 text-white">
      {/* Background Hero Architecture Image with subtle dark gradient vignette */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 scale-105 transition-transform duration-1000"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&auto=format&fit=crop&q=80')`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-900/60" />

      {/* Hero Content Container */}
      <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 sm:pt-20 sm:pb-24 lg:px-8">
        {/* Main Headline */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-blue-200 backdrop-blur-md shadow-inner">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Noida & NCR’s Most Trusted Real Estate Marketplace</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
            Find Your <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">Dream Property</span> in Noida
          </h1>

          <p className="text-sm sm:text-base text-slate-300 font-normal max-w-2xl mx-auto">
            Browse verified luxury apartments, high-yield commercial hubs, and premium residential plots from certified developers & verified owners.
          </p>
        </div>

        {/* Floating Modern Search Console */}
        <div className="mt-10 max-w-4xl mx-auto">
          {/* Navigation Tabs */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 overflow-x-auto pb-3 scrollbar-none">
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold tracking-wide transition-all duration-200 whitespace-nowrap cursor-pointer shadow-sm ${
                    active
                      ? "bg-blue-600 text-white shadow-blue-600/40 shadow-md ring-2 ring-blue-400/30 scale-105"
                      : "bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white backdrop-blur-md border border-white/10"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Box Card */}
          <form
            onSubmit={handleSearch}
            className="rounded-2xl sm:rounded-3xl bg-white p-3 sm:p-5 shadow-2xl shadow-black/40 border border-slate-100 text-slate-800"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
              {/* City & Locality Input */}
              <div className="lg:col-span-5 relative">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Location / Sector
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. Sector 43, Sector 128, Gaur City..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-9 pr-3 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition"
                  />
                </div>
              </div>

              {/* Property Type Dropdown */}
              <div className="lg:col-span-3">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Property Type
                </label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 px-3 text-xs sm:text-sm font-semibold text-slate-700 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition"
                >
                  <option value="">All Property Types</option>
                  <option value="APARTMENT">Apartment / Flat</option>
                  <option value="VILLA">Luxury Villa</option>
                  <option value="INDEPENDENT_HOUSE">Independent Floor</option>
                  <option value="PLOT">Residential Plot</option>
                  <option value="COMMERCIAL">Commercial Space</option>
                  <option value="OFFICE">Office Space</option>
                </select>
              </div>

              {/* Budget Range Dropdown */}
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Budget
                </label>
                <select
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 px-3 text-xs sm:text-sm font-semibold text-slate-700 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition"
                >
                  <option value="">Any Budget</option>
                  <option value="under_50l">Under ₹50 Lacs</option>
                  <option value="50l_1cr">₹50L - ₹1 Cr</option>
                  <option value="1cr_2cr">₹1 Cr - ₹2 Cr</option>
                  <option value="2cr_5cr">₹2 Cr - ₹5 Cr</option>
                  <option value="above_5cr">Above ₹5 Cr</option>
                </select>
              </div>

              {/* Search Submit Button */}
              <div className="lg:col-span-2 flex flex-col justify-end pt-1 sm:pt-0">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 py-3 px-4 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-600/30 transition hover:shadow-lg hover:shadow-blue-600/40 cursor-pointer active:scale-95"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Search</span>
                </button>
              </div>
            </div>

            {/* Bedroom Quick Filters for Residential */}
            {(activeTab === "BUY" || activeTab === "RENT") && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold">BHK:</span>
                  {["", "1", "2", "3", "4"].map((bhk) => (
                    <button
                      key={bhk}
                      type="button"
                      onClick={() => setBedrooms(bhk)}
                      className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                        bedrooms === bhk
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {bhk === "" ? "Any" : `${bhk} BHK`}
                    </button>
                  ))}
                </div>

                <div className="text-slate-400 text-[11px] hidden sm:block">
                  {propertyCount} verified properties ready for inspection
                </div>
              </div>
            )}
          </form>

          {/* Quick Locality Chips */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Popular:</span>
            {POPULAR_LOCALITIES.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => handleQuickLocality(loc)}
                className="rounded-full bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-1 text-slate-200 hover:text-white transition font-medium cursor-pointer"
              >
                {loc}
              </button>
            ))}
          </div>
        </div>

        {/* Trust Badges Bar */}
        <div className="mt-14 pt-8 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-white">100%</div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">RERA Verified Projects</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-white">₹0</div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Brokerage on Select Units</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-white">5,000+</div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Families Relocated</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-white">24/7</div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Dedicated Assistance</div>
          </div>
        </div>
      </div>
    </section>
  );
}
