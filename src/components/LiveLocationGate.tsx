"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const SKIP = ["/terms", "/privacy-policy"];
const SEND_EVERY_MS = 60_000;

// Live location is mandatory for every signed-in person except the admin team: partners are buzzed by where
// they are now and buyers / owners are matched by where they are. Blocks the page until location is on,
// then keeps the position fresh (sent to the server at most once a minute).
export function LiveLocationGate() {
  const pathname = usePathname();
  const [ok, setOk] = useState(false);
  const [denied, setDenied] = useState(false);
  const [asking, setAsking] = useState(false);
  const lastSent = useRef(0);

  const send = useCallback((pos: GeolocationPosition) => {
    setOk(true);
    setDenied(false);
    const now = Date.now();
    if (now - lastSent.current < SEND_EVERY_MS) return;
    lastSent.current = now;
    fetch("/api/location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
    }).catch(() => {});
  }, []);

  const ask = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setDenied(true);
      return;
    }
    setAsking(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setAsking(false);
        send(p);
      },
      () => {
        setAsking(false);
        setOk(false);
        setDenied(true);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }, [send]);

  useEffect(() => {
    ask();
  }, [ask]);

  useEffect(() => {
    if (!ok || !("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(send, () => setOk(false), { enableHighAccuracy: true, maximumAge: 30000 });
    return () => navigator.geolocation.clearWatch(id);
  }, [ok, send]);

  if (ok || SKIP.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-ink/80 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
        <h2 className="font-display text-2xl font-semibold text-ink">Turn on your location</h2>
        <p className="mt-2 text-sm text-slate-600">
          Pronesto needs your live location to match you with properties and nearby partners. Please allow location access to continue.
        </p>
        {denied && (
          <p className="field-error mt-3 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-600">
            Location is blocked. Tap the lock icon next to the web address, set Location to &quot;Allow&quot;, then press the button again.
          </p>
        )}
        <button
          type="button"
          onClick={ask}
          disabled={asking}
          className="mt-5 w-full rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {asking ? "Checking…" : "Allow location"}
        </button>
      </div>
    </div>
  );
}
