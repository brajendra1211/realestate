"use client";

import { useEffect, useState } from "react";

const selectClass =
  "mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400";

// §3.6: "Radius (1/3/5 km) → Society (auto-populated for that radius)" —
// pure dropdowns, no free text. Society list re-fetches whenever radius
// changes, same cascading pattern as GeoCascadeFields.tsx.
export function BroadcastSocietyField() {
  const [radiusKm, setRadiusKm] = useState(1);
  const [societies, setSocieties] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/agent/broadcast/societies?radiusKm=${radiusKm}`)
      .then((res) => res.json())
      .then((data: string[]) => setSocieties(data))
      .finally(() => setLoading(false));
  }, [radiusKm]);

  return (
    <>
      <div>
        <label className="text-sm font-medium text-slate-700">Radius</label>
        <select
          name="radiusKm"
          value={radiusKm}
          onChange={(event) => setRadiusKm(Number(event.target.value))}
          className={selectClass}
        >
          <option value={1}>1 km</option>
          <option value={3}>3 km</option>
          <option value={5}>5 km</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">Society (optional)</label>
        <select name="society" defaultValue="" disabled={loading} className={selectClass}>
          <option value="">
            {loading ? "Loading…" : societies.length === 0 ? "No societies found nearby" : "Any society"}
          </option>
          {societies.map((society) => (
            <option key={society} value={society}>
              {society}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
