"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NearMeButton } from "../NearMeButton";

type AcresHeroProps = {
  propertyCount: number;
  agentCount: number;
  cityCount: number;
  currentCityName?: string | null;
  cities: { slug: string; name: string }[];
};

type TabType = "BUY" | "RENT" | "PROJECTS" | "COMMERCIAL" | "PLOT";

const TABS: { id: TabType; label: string; badge?: string }[] = [
  { id: "BUY", label: "Buy" },
  { id: "RENT", label: "Rent" },
  { id: "PROJECTS", label: "New Projects" },
  { id: "COMMERCIAL", label: "Commercial" },
  { id: "PLOT", label: "Plots / Land" },
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
  const [selectedCity, setSelectedCity] = useState(currentCityName || "");
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
    if (query.trim()) params.set("city", query.trim()); // The search endpoint checks city/locality

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

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#003b6d] via-[#004e92] to-[#005ea6] text-white pt-10 pb-16 px-4 sm:px-6 lg:px-8">
      {/* Decorative architectural grid background overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(#ffffff 1px, transparent 1px), radial-gradient(#ffffff 1px, #003b6d 1px)",
          backgroundSize: "40px 40px",
          backgroundPosition: "0 0, 20px 20px",
        }}
      />

      <div className="relative mx-auto max-w-5xl">
        {/* Top Trust Badge */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-blue-100 backdrop-blur-md border border-white/15">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Over 10,000+ Verified Listings Across India</span>
            <span className="hidden sm:inline text-white/40">•</span>
            <span className="hidden sm:inline text-amber-300 font-bold">Zero Brokerage on Direct Owner Properties</span>
          </div>
        </div>

        {/* Main Headline */}
        <div className="mt-5 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-white drop-shadow-sm">
            Real Estate Search <span className="text-amber-400">Made Simple.</span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-blue-100 max-w-2xl mx-auto font-normal">
            Buy, rent or invest in verified flats, luxury villas, commercial spaces and upcoming RERA projects with authorized channel partners.
          </p>
        </div>

        {/* --- 99ACRES FLOATING SEARCH BOX --- */}
        <div className="mt-8 mx-auto max-w-4xl">
          {/* Top Search Tabs */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-2 px-2">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === "COMMERCIAL") setPropertyType("COMMERCIAL");
                    else if (tab.id === "PLOT") setPropertyType("PLOT");
                    else setPropertyType("");
                  }}
                  className={`relative px-4 py-2 text-xs sm:text-sm font-bold rounded-t-xl transition-all ${
                    isActive
                      ? "bg-white text-[#0054a6] shadow-sm z-10"
                      : "bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm"
                  }`}
                >
                  {tab.label}
                  {tab.badge && (
                    <span className="ml-1.5 rounded-full bg-amber-400 text-slate-900 text-[10px] px-1.5 py-0.2 font-extrabold">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Post Property Free Tab Link */}
            <Link
              href="/register"
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-300 hover:text-white transition"
            >
              <span>Post Property</span>
              <span className="rounded-full bg-emerald-500 text-white px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
                FREE
              </span>
            </Link>
          </div>

          {/* Main White Search Form Container */}
          <form
            onSubmit={handleSearch}
            className="relative z-10 bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-2xl border border-slate-100 text-slate-800"
          >
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 items-center">
              {/* 1. City Dropdown */}
              <div className="sm:col-span-3 flex items-center gap-2 border-b sm:border-b-0 sm:border-r border-slate-200 px-2 py-2">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0 text-[#0054a6]">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Location
                  </label>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-900 focus:outline-none cursor-pointer"
                  >
                    <option value="">All India / Any City</option>
                    {cities.map((c) => (
                      <option key={c.slug} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    {!cities.some((c) => c.name.toLowerCase() === "bengaluru") && (
                      <option value="Bengaluru">Bengaluru</option>
                    )}
                    {!cities.some((c) => c.name.toLowerCase() === "mumbai") && (
                      <option value="Mumbai">Mumbai</option>
                    )}
                    {!cities.some((c) => c.name.toLowerCase() === "delhi") && (
                      <option value="Delhi">Delhi NCR</option>
                    )}
                    {!cities.some((c) => c.name.toLowerCase() === "pune") && (
                      <option value="Pune">Pune</option>
                    )}
                    {!cities.some((c) => c.name.toLowerCase() === "hyderabad") && (
                      <option value="Hyderabad">Hyderabad</option>
                    )}
                  </select>
                </div>
              </div>

              {/* 2. Main Search Input */}
              <div className="sm:col-span-5 flex items-center gap-2 border-b sm:border-b-0 sm:border-r border-slate-200 px-2 py-2">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0 text-slate-400">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                  />
                </svg>
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Search Locality / Project
                  </label>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={
                      activeTab === "BUY"
                        ? "e.g. Whitefield, Indiranagar, Prestige..."
                        : activeTab === "RENT"
                        ? "e.g. 2 BHK, HSR Layout, Koramangala..."
                        : activeTab === "PROJECTS"
                        ? "e.g. Lakeside Habitat, Godrej Woods..."
                        : activeTab === "COMMERCIAL"
                        ? "e.g. IT Park, Retail Shops, MG Road..."
                        : "e.g. Residential Plot, Devanahalli..."
                    }
                    className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
                  />
                </div>
              </div>

              {/* 3. Property Type or Budget Dropdown */}
              <div className="sm:col-span-2 flex items-center gap-2 border-b sm:border-b-0 border-slate-200 px-2 py-2">
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Budget
                  </label>
                  <select
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="">Any Budget</option>
                    <option value="under_50l">Under ₹50 Lac</option>
                    <option value="50l_1cr">₹50L - ₹1 Cr</option>
                    <option value="1cr_2cr">₹1 Cr - ₹2 Cr</option>
                    <option value="2cr_5cr">₹2 Cr - ₹5 Cr</option>
                    <option value="above_5cr">₹5 Cr+</option>
                  </select>
                </div>
              </div>

              {/* 4. Search Submit Button */}
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-[#0054a6] hover:bg-[#004080] active:scale-[0.98] px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-white shadow-md transition-all duration-200"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 stroke-[2.5]">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                    />
                  </svg>
                  <span>Search</span>
                </button>
              </div>
            </div>

            {/* Quick Filters Row (BHK pills & Property Type) */}
            {(activeTab === "BUY" || activeTab === "RENT") && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mr-1">
                    BHK:
                  </span>
                  {["", "1", "2", "3", "4"].map((bhk) => (
                    <button
                      key={bhk}
                      type="button"
                      onClick={() => setBedrooms(bhk)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition text-xs ${
                        bedrooms === bhk
                          ? "bg-[#0054a6] text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {bhk === "" ? "Any" : `${bhk} BHK`}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                    Type:
                  </span>
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="">All Residential</option>
                    <option value="APARTMENT">Apartments / Flats</option>
                    <option value="VILLA">Villas</option>
                    <option value="INDEPENDENT_HOUSE">Independent Houses</option>
                    <option value="PLOT">Plots / Land</option>
                  </select>
                </div>
              </div>
            )}
          </form>

          {/* Trending Searches Row */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-blue-100">
            <span className="font-bold text-amber-300">Popular Searches:</span>
            <Link
              href="/properties?condition=RESALE"
              className="rounded-full bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1 text-white transition backdrop-blur-xs"
            >
              ⚡ Ready to Move
            </Link>
            <Link
              href="/properties?propertyType=APARTMENT"
              className="rounded-full bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1 text-white transition backdrop-blur-xs"
            >
              🏢 Flats & Apartments
            </Link>
            <Link
              href="/properties?propertyType=VILLA"
              className="rounded-full bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1 text-white transition backdrop-blur-xs"
            >
              🏡 Luxury Villas
            </Link>
            <Link
              href="/projects"
              className="rounded-full bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1 text-white transition backdrop-blur-xs"
            >
              🏗️ Upcoming Projects
            </Link>
            <Link
              href="/properties?maxPrice=10000000"
              className="rounded-full bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1 text-white transition backdrop-blur-xs"
            >
              💰 Under ₹1 Crore
            </Link>
            <div className="inline-block">
              <NearMeButton className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 px-3 py-1 text-emerald-200 text-xs font-bold transition" />
            </div>
          </div>
        </div>

        {/* 99acres Top Statistics Bar */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center border-t border-white/15 pt-8">
          <div className="p-2">
            <p className="text-2xl sm:text-3xl font-black text-white">
              {propertyCount.toLocaleString("en-IN")}+
            </p>
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider mt-0.5">
              Verified Properties
            </p>
          </div>
          <div className="p-2">
            <p className="text-2xl sm:text-3xl font-black text-amber-300">
              {agentCount.toLocaleString("en-IN")}+
            </p>
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider mt-0.5">
              Channel Partners
            </p>
          </div>
          <div className="p-2">
            <p className="text-2xl sm:text-3xl font-black text-white">
              {cityCount.toLocaleString("en-IN")}+
            </p>
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider mt-0.5">
              Cities Covered
            </p>
          </div>
          <div className="p-2">
            <p className="text-2xl sm:text-3xl font-black text-emerald-300">
              ₹0 Brokerage
            </p>
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider mt-0.5">
              Direct Owner Deals
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
