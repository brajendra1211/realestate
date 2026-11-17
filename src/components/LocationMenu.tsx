"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { setLocationCookie } from "@/app/actions/location";

type CityOption = { slug: string; name: string };

const TOP_METROS = [
  "Noida",
  "Gurgaon",
  "Delhi NCR",
  "Bengaluru",
  "Mumbai",
  "Hyderabad",
  "Pune",
  "Dubai",
];

export function LocationMenu({
  currentCity,
  cities,
}: {
  currentCity: { slug: string; name: string } | null;
  cities: CityOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [switching, setSwitching] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const filteredCities = cities.filter((city) =>
    city.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  async function switchCity(city: CityOption) {
    setSwitching(true);
    await setLocationCookie({
      citySlug: city.slug,
      cityName: city.name,
      localitySlug: null,
      localityName: null,
    });
    setSwitching(false);
    setOpen(false);
    setQuery("");
    router.refresh();
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setSwitching(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(`/api/geo/nearest?lat=${latitude}&lng=${longitude}`);
          if (response.ok) {
            const data = await response.json();
            if (data.citySlug) {
              await setLocationCookie({
                citySlug: data.citySlug,
                cityName: data.cityName,
                localitySlug: data.localitySlug ?? null,
                localityName: data.localityName ?? null,
              });
              router.refresh();
            }
          }
        } finally {
          setSwitching(false);
          setOpen(false);
        }
      },
      () => setSwitching(false)
    );
  }

  const activeCityName = currentCity ? currentCity.name : "Noida";

  return (
    <div ref={rootRef} className="relative">
      {/* 99acres-Style Location Trigger (Clean SVG, No Emojis, No Clunky Pills) */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Location: ${activeCityName}`}
        className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-ink transition hover:border-brand-600"
      >
        <svg className="h-3.5 w-3.5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="truncate max-w-[100px] sm:max-w-[130px]">{activeCityName}</span>
        <svg className={`h-3 w-3 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 sm:w-96 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-[0_30px_80px_-20px_rgba(10,18,48,0.3)] animate-fade-in-up">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Select City / Hub</span>
            <span className="text-[11px] text-slate-400">Pan-India Network</span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your city (e.g. Noida, Gurgaon)..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:border-brand-600 focus:bg-white focus:outline-none transition"
              autoFocus
            />
          </div>

          {/* Detect Location Button */}
          <button
            type="button"
            onClick={useMyLocation}
            disabled={switching}
            className="mt-2.5 flex items-center justify-center gap-2 w-full rounded-xl border border-blue-100 bg-blue-50/80 hover:bg-blue-100 py-2 px-3 text-xs font-bold text-brand-600 transition disabled:opacity-60 cursor-pointer"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="7" strokeWidth="2" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
              <path strokeLinecap="round" strokeWidth="2" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
            </svg>
            <span>{switching ? "Detecting location..." : "Use Current Location"}</span>
          </button>

          {/* Popular Metros Chips */}
          <div className="mt-3.5 pt-3 border-t border-slate-100">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Popular Metros
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {TOP_METROS.map((metroName) => {
                const match = cities.find((c) => c.name.toLowerCase() === metroName.toLowerCase()) || {
                  slug: metroName.toLowerCase().replace(/\s+/g, "-"),
                  name: metroName,
                };
                const isActive = activeCityName.toLowerCase() === metroName.toLowerCase();
                return (
                  <button
                    key={metroName}
                    type="button"
                    onClick={() => switchCity(match)}
                    className={`rounded-lg py-1.5 px-2 text-xs font-semibold transition text-center truncate cursor-pointer ${
                      isActive
                        ? "bg-brand-600 text-white shadow-xs font-bold"
                        : "bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60"
                    }`}
                  >
                    {metroName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filtered Cities List (if typing) */}
          {query.trim() && filteredCities.length > 0 && (
            <div className="mt-3 max-h-36 overflow-y-auto space-y-1 pt-2 border-t border-slate-100 scrollbar-thin">
              {filteredCities.map((city) => (
                <button
                  key={city.slug}
                  type="button"
                  onClick={() => switchCity(city)}
                  className={`block w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition ${
                    activeCityName.toLowerCase() === city.name.toLowerCase()
                      ? "bg-blue-50 text-brand-600"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {city.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
