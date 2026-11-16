"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Loader2 } from "lucide-react";
import { rebuzzAction } from "../actions";

const COOLDOWN_S = 60;

/** Owner rings the partners again — free, any time until someone accepts. */
export function RebuzzButton({
  requestId,
  statusToken,
  lastBuzzAt,
  buzzCount,
}: {
  requestId: string;
  statusToken: string;
  lastBuzzAt: string | null;
  buzzCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const remaining =
    lastBuzzAt && now ? Math.max(0, Math.ceil((new Date(lastBuzzAt).getTime() + COOLDOWN_S * 1000 - now) / 1000)) : 0;

  async function click() {
    setBusy(true);
    setMessage(null);
    try {
      const r = await rebuzzAction(requestId, statusToken);
      setMessage(r ? `Buzzer sent to ${r.reached} partner${r.reached === 1 ? "" : "s"}.` : "Buzzer sent.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not buzz right now.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-bold text-amber-900">Nobody has picked it up yet?</p>
      <p className="mt-0.5 text-xs text-amber-800">
        You can buzz the partners again as many times as you need. No extra payment, until one of them accepts.
        {buzzCount > 0 && ` Buzzed ${buzzCount} time${buzzCount === 1 ? "" : "s"} so far.`}
      </p>
      <button
        type="button"
        onClick={click}
        disabled={busy || remaining > 0}
        className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
        {remaining > 0 ? `Buzz again in ${remaining}s` : "Buzz partners again"}
      </button>
      {message && <p className="mt-2 text-xs font-semibold text-amber-900">{message}</p>}
    </div>
  );
}
