"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PROPERTY_TYPE_LABELS } from "@/lib/format";
import { setLocationCookie } from "@/app/actions/location";

type CityOption = { slug: string; name: string };

const PROPERTY_TYPES = Object.keys(PROPERTY_TYPE_LABELS);

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

  const cityQuery = currentCity ? encodeURIComponent(currentCity.name) : "";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={currentCity ? `Location: ${currentCity.name}` : "Select location"}
        className="flex shrink-0 items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 sm:gap-1.5 sm:px-3"
      >
        <span>📍</span>
        <span className="hidden max-w-[110px] truncate sm:inline">
          {currentCity ? currentCity.name : "Select location"}
        </span>
        <span className="text-xs text-slate-400">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[calc(100vw-2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:w-96">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search city…"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />

          <button
            type="button"
            onClick={useMyLocation}
            disabled={switching}
            className="mt-2 w-full rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-left text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-60"
          >
            📍 {switching ? "Finding you…" : "Use my current location"}
          </button>

          {filteredCities.length > 0 && (
            <div className="mt-3 max-h-40 space-y-0.5 overflow-y-auto">
              {filteredCities.map((city) => (
                <button
                  key={city.slug}
                  type="button"
                  onClick={() => switchCity(city)}
                  className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm hover:bg-slate-50 ${
                    currentCity?.slug === city.slug ? "font-semibold text-blue-700" : "text-slate-700"
                  }`}
                >
                  {city.name}
                </button>
              ))}
            </div>
          )}

          {currentCity && (
            <>
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Properties in {currentCity.name}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {PROPERTY_TYPES.map((type) => (
                    <Link
                      key={type}
                      href={`/properties?city=${cityQuery}&propertyType=${type}`}
                      onClick={() => setOpen(false)}
                      className="rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      {PROPERTY_TYPE_LABELS[type]}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Popular searches
                </p>
                <div className="mt-2 space-y-1">
                  <Link
                    href={`/properties?city=${cityQuery}&listingType=SALE`}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Property for sale in {currentCity.name}
                  </Link>
                  <Link
                    href={`/properties?city=${cityQuery}&listingType=RENT`}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Property for rent in {currentCity.name}
                  </Link>
                  <Link
                    href={`/properties-in/${currentCity.slug}`}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Verified property in {currentCity.name}
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
