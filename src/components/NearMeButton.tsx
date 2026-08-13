"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NearMeButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!navigator.geolocation) {
      setError("Location isn't supported on this device.");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(`/api/geo/nearest?lat=${latitude}&lng=${longitude}`);
          if (!response.ok) throw new Error("No nearby locations found");
          const data = await response.json();
          const path = data.localitySlug
            ? `/properties-in/${data.citySlug}/${data.localitySlug}`
            : `/properties-in/${data.citySlug}`;
          router.push(path);
        } catch {
          setError("Couldn't find properties near you. Try browsing by location instead.");
          setLoading(false);
        }
      },
      () => {
        setError("Location access denied. Try browsing by location instead.");
        setLoading(false);
      }
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={
          className ??
          "inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
        }
      >
        📍 {loading ? "Finding you…" : "Properties near me"}
      </button>
      {error && <p className="mt-2 text-xs text-red-200">{error}</p>}
    </div>
  );
}
