"use client";

import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socketClient";

type NearbyAlert = { scannedAgentCode: string; scannedAgentName: string; distanceKm: number | null };

// Mounted once in src/app/agent/layout.tsx (every /agent/* page) — joins
// this partner's socket room (same "join" handshake server.js already
// handles for dispatch/broadcast) and rings + banners on a nearby QR scan.
// Covers the dashboard-tab-open case only; the mobile app covers
// background/closed via FCM (src/lib/push.ts).
export function ShopScanAlertListener({ agentProfileId }: { agentProfileId: string }) {
  const [alert, setAlert] = useState<NearbyAlert | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("join", { agentProfileId });

    function onNearby(payload: NearbyAlert) {
      setAlert(payload);
      playRing();
      if (Notification.permission === "granted") {
        new Notification("Buyer nearby", {
          body: `A buyer just scanned ${payload.scannedAgentName}'s QR code near you.`,
        });
      }
    }

    socket.on("shop-scan:nearby", onNearby);
    return () => {
      socket.off("shop-scan:nearby", onNearby);
    };
  }, [agentProfileId]);

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  function playRing() {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = audioCtxRef.current ?? new Ctx();
      audioCtxRef.current = ctx;

      // Two quick ascending beeps — no audio asset to license/ship, just a
      // synthesized tone (Web Audio API, works in every modern browser).
      [880, 1175].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const start = ctx.currentTime + i * 0.22;
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
        osc.start(start);
        osc.stop(start + 0.22);
      });
    } catch {
      // Autoplay can be blocked before the first user interaction on the
      // page — the on-screen banner below still shows regardless.
    }
  }

  if (!alert) return null;

  return (
    <div className="fixed right-4 top-4 z-50 w-full max-w-sm animate-in slide-in-from-top-2">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-lg">
        <span className="text-2xl">🔔</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">Buyer nearby</p>
          <p className="mt-0.5 text-xs text-slate-600">
            A buyer just scanned {alert.scannedAgentName}&apos;s QR code
            {alert.distanceKm !== null ? ` (${Math.round(alert.distanceKm * 1000)}m away)` : ""}.
          </p>
        </div>
        <button
          onClick={() => setAlert(null)}
          className="shrink-0 text-xs font-medium text-slate-400 hover:text-slate-700"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
