"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setLocationCookie } from "@/app/actions/location";

const PROMPTED_KEY = "baya_location_prompted";

export function LocationDetector({ hasLocation }: { hasLocation: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (hasLocation) return;
    if (!navigator.geolocation) return;
    if (sessionStorage.getItem(PROMPTED_KEY)) return;
    sessionStorage.setItem(PROMPTED_KEY, "1");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(`/api/geo/nearest?lat=${latitude}&lng=${longitude}`);
          if (!response.ok) return;
          const data = await response.json();
          if (!data.citySlug) return;

          await setLocationCookie({
            citySlug: data.citySlug,
            cityName: data.cityName,
            localitySlug: data.localitySlug ?? null,
            localityName: data.localityName ?? null,
          });
          router.refresh();
        } catch {
          // Silently ignore — user can still pick a location manually.
        }
      },
      () => {
        // Permission denied or unavailable — fall back to manual selection.
      }
    );
  }, [hasLocation, router]);

  return null;
}
