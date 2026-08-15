import { getAgentsOfTheWeek, getTodaysDealTicker, getAreaDominance } from "@/lib/gamification";

const BADGE_LABELS: Record<string, string> = {
  TOP_SELLER: "Top Seller",
  FASTEST_RESPONDER: "Fastest Responder",
  "5-STAR": "5-Star Agent",
};

const BADGE_STYLE: Record<string, { ring: string; chip: string; icon: string }> = {
  TOP_SELLER: {
    ring: "from-amber-400 to-orange-500",
    chip: "bg-amber-50 text-amber-700",
    icon: "M12 2l2.6 6.5L21 9l-5 4.5L17.5 21 12 17.5 6.5 21 8 13.5 3 9l6.4-.5z",
  },
  FASTEST_RESPONDER: {
    ring: "from-blue-500 to-indigo-500",
    chip: "bg-blue-50 text-blue-700",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  "5-STAR": {
    ring: "from-fuchsia-500 to-purple-500",
    chip: "bg-fuchsia-50 text-fuchsia-700",
    icon: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  },
};

export default async function LeaderboardPage() {
  const [agentsOfWeek, ticker, dominance] = await Promise.all([
    getAgentsOfTheWeek(),
    getTodaysDealTicker(),
    getAreaDominance(),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="animate-fade-in-up">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 2l2.6 6.5L21 9l-5 4.5L17.5 21 12 17.5 6.5 21 8 13.5 3 9l6.4-.5z" />
          </svg>
          Live rankings
        </span>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Agent Leaderboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Trust and momentum, computed live from real activity (§3.18) — not editorial picks.
        </p>
      </div>

      {ticker.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-xl border border-amber-200 bg-amber-50">
          <div className="group flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm text-amber-800">
            <span className="shrink-0 font-semibold">🔥 Today:</span>
            <div className="overflow-hidden">
              <div className="animate-marquee flex gap-8 group-hover:[animation-play-state:paused]">
                {[...ticker, ...ticker].map((item, i) => (
                  <span key={i} className="shrink-0">
                    <span className="font-mono font-semibold">{item.agentCode}</span> {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Agents of the Week</h2>
      {agentsOfWeek.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          <svg viewBox="0 0 24 24" fill="none" className="mx-auto h-9 w-9 text-slate-300">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2l2.6 6.5L21 9l-5 4.5L17.5 21 12 17.5 6.5 21 8 13.5 3 9l6.4-.5z" />
          </svg>
          <p className="mt-2">Not enough activity yet to compute this week&apos;s badges.</p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {agentsOfWeek.map((card) => {
            const style = BADGE_STYLE[card.badge] ?? BADGE_STYLE.TOP_SELLER;
            return (
              <div
                key={`${card.agentId}-${card.badge}`}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r ${style.ring}`} />
                <div
                  className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br ${style.ring} text-white shadow-sm`}
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                    <path d={style.icon} />
                  </svg>
                </div>
                <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${style.chip}`}>
                  {BADGE_LABELS[card.badge] ?? card.badge}
                </span>
                <p className="mt-3 font-semibold text-slate-900">{card.agentName}</p>
                <p className="font-mono text-sm text-slate-500">{card.agentCode}</p>
                {card.city && <p className="mt-1 text-xs text-slate-400">{card.city}</p>}
                {card.phone && (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <a
                      href={`tel:${card.phone}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
                    >
                      Call
                    </a>
                    <a
                      href={`https://wa.me/${card.phone.replace(/[^\d]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700"
                    >
                      WhatsApp
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <h2 className="mt-10 text-lg font-semibold text-slate-900">Area dominance</h2>
      {dominance.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          <svg viewBox="0 0 24 24" fill="none" className="mx-auto h-9 w-9 text-slate-300">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21s-7-6.1-7-11a7 7 0 1114 0c0 4.9-7 11-7 11z" />
            <circle cx="12" cy="10" r="2.5" strokeWidth={1.5} />
          </svg>
          <p className="mt-2">No area has enough listings from one agent yet.</p>
        </div>
      ) : (
        <div className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {dominance.map((entry, i) => (
            <div key={entry.area} className="flex items-center gap-3 px-4 py-3 text-sm transition hover:bg-slate-50">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">King of {entry.area}</p>
                <p className="text-xs text-slate-500">
                  {entry.agentName} ({entry.agentCode})
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">
                {entry.listingCount} listings
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
