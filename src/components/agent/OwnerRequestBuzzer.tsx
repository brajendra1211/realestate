"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, MapPin, UserSearch, X } from "lucide-react";

type OwnerPending = {
  id: string; city: string; locality: string | null; plan: "BASIC" | "GOLD"; createdAt: string; buzzCount: number;
  distanceKm: number | null; mapUrl: string | null;
  property: { title: string; type: string; bedrooms: number | null; areaSqft: number | null; rent: number; photo: string | null; photos: number } | null;
};
type BuyerPending = { id: string; title: string; summary: string; primary: boolean; buzzCount: number; createdAt: string };

const POLL_MS = 5000;

/**
 * The buzzer. Mounted for every /agent page: polls for (1) owners who paid to list a
 * rental and (2) buyers who paid to see a property, rings phone-style and shows an
 * Accept banner. The first partner to accept gets the contact; the rest see it vanish.
 */
export function OwnerRequestBuzzer() {
  const router = useRouter();
  const [owners, setOwners] = useState<OwnerPending[]>([]);
  const [buyers, setBuyers] = useState<BuyerPending[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  const ring = useCallback(() => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = ctxRef.current ?? new Ctx();
      ctxRef.current = ctx;
      const play = () => {
        for (let r = 0; r < 6; r++) {
          [880, 1175].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = freq;
            osc.connect(gain);
            gain.connect(ctx.destination);
            const t = ctx.currentTime + r * 0.8 + i * 0.22;
            gain.gain.setValueAtTime(0.001, t);
            gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            osc.start(t);
            osc.stop(t + 0.22);
          });
        }
      };
      if (ctx.state === "suspended") ctx.resume().then(play).catch(() => {});
      else play();
    } catch {
      /* autoplay blocked before first interaction; the banner still shows */
    }
  }, []);

  useEffect(() => {
    function unlock() {
      try {
        ctxRef.current?.resume();
      } catch {}
    }
    document.addEventListener("pointerdown", unlock, { once: true });
    return () => document.removeEventListener("pointerdown", unlock);
  }, []);

  useEffect(() => {
    let stop = false;
    async function poll() {
      try {
        const res = await fetch("/api/agent/listing-requests", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { pending: OwnerPending[]; interests?: BuyerPending[] };
        if (stop) return;
        const interests = data.interests ?? [];
        setOwners(data.pending);
        setBuyers(interests);

        // A request rings again every time it is buzzed (buzzCount changes).
        const keys = [
          ...data.pending.map((p) => ({ k: `o:${p.id}:${p.buzzCount}`, text: `An owner in ${p.locality ?? p.city} wants to list a property.`, title: "New owner listing request" })),
          ...interests.map((p) => ({ k: `b:${p.id}:${p.buzzCount}`, text: p.primary ? `A buyer paid to unlock "${p.title}".` : `A buyer wants: ${p.summary}`, title: "Buyer wants to see a property" })),
        ];
        if (seen.current === null) {
          seen.current = new Set(keys.map((x) => x.k)); // first load: don't ring for requests already waiting
        } else {
          const fresh = keys.filter((x) => !seen.current!.has(x.k));
          if (fresh.length > 0) {
            ring();
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification(fresh[0].title, { body: fresh[0].text });
            }
          }
          fresh.forEach((x) => seen.current!.add(x.k));
        }
      } catch {
        /* offline: try again next tick */
      }
    }
    poll();
    const timer = window.setInterval(poll, POLL_MS);
    if (typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission();
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [ring]);

  async function accept(kind: "owner" | "buyer", id: string) {
    setBusyId(id);
    setMessage(null);
    try {
      const res = await fetch(kind === "owner" ? "/api/agent/listing-requests/accept" : "/api/agent/buyer-interests/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.push(kind === "owner" ? "/agent/owner-requests" : "/agent/buyer-leads");
        router.refresh();
      } else {
        setMessage(data.error ?? "Could not accept this request.");
        if (kind === "owner") setOwners((p) => p.filter((x) => x.id !== id));
        else setBuyers((p) => p.filter((x) => x.id !== id));
      }
    } finally {
      setBusyId(null);
    }
  }

  if (owners.length === 0 && buyers.length === 0 && !message) return null;

  return (
    <div className="fixed inset-x-3 top-3 z-[60] mx-auto max-h-[90vh] max-w-md space-y-2 overflow-y-auto md:left-auto md:right-6 md:top-6">
      {message && (
        <div className="flex items-start justify-between gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lift">
          {message}
          <button onClick={() => setMessage(null)} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {buyers.map((p) => (
        <div key={p.id} className="animate-pulse-ring rounded-2xl border-2 border-emerald-400 bg-white p-4 shadow-lift">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
              <UserSearch className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-ink">
                {p.primary ? "A buyer paid to see your listing" : "A buyer near you wants a property"}
              </p>
              <p className="text-xs text-slate-500">{p.primary ? p.title : p.summary}</p>
              <button
                onClick={() => accept("buyer", p.id)}
                disabled={busyId === p.id}
                className="mt-3 w-full cursor-pointer rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {busyId === p.id ? "Accepting…" : "Accept & get the buyer's number"}
              </button>
            </div>
          </div>
        </div>
      ))}

      {owners.map((p) => (
        <div key={p.id} className="animate-pulse-ring rounded-2xl border-2 border-gold-400 bg-white p-4 shadow-lift">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-400 text-ink">
              <BellRing className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-ink">New owner wants to list a property</p>
              <p className="text-xs text-slate-500">
                {[p.locality, p.city].filter(Boolean).join(", ")} · {p.plan === "GOLD" ? "Pro" : "Basic"} plan · paid
              </p>
              {p.property && (
                <div className="mt-2 flex gap-3 rounded-xl bg-slate-50 p-2">
                  {p.property.photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.property.photo} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0 text-xs text-slate-600">
                    <p className="truncate font-bold text-ink">{p.property.title}</p>
                    <p>
                      {p.property.type.replace(/_/g, " ")}
                      {p.property.bedrooms ? ` · ${p.property.bedrooms} BHK` : ""}
                      {p.property.areaSqft ? ` · ${p.property.areaSqft} sqft` : ""}
                    </p>
                    <p className="font-semibold">Rent ₹{p.property.rent.toLocaleString("en-IN")} · {p.property.photos} photos</p>
                  </div>
                </div>
              )}
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                {p.distanceKm != null && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-rose-500" /> {p.distanceKm} km from you</span>}
                {p.mapUrl && <a href={p.mapUrl} target="_blank" rel="noreferrer" className="text-brand-600 underline">View on map</a>}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">Accept, visit the property, check details and photos, then verify with the owner&apos;s OTP.</p>
              <button
                onClick={() => accept("owner", p.id)}
                disabled={busyId === p.id}
                className="mt-3 w-full cursor-pointer rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {busyId === p.id ? "Accepting…" : "Accept & get the owner's number"}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
