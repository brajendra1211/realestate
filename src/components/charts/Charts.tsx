"use client";

import { useState, type ReactNode } from "react";

// Plain SVG/HTML charts (no chart library). Colors come from the --viz-* tokens
// defined in globals.css (validated categorical palette, light + dark steps).

export type Series = { name: string; color: string };
const fmtINR = (n: number) =>
  n >= 10000000 ? `₹${(n / 10000000).toFixed(2)} Cr` : n >= 100000 ? `₹${(n / 100000).toFixed(2)} L` : `₹${Math.round(n).toLocaleString("en-IN")}`;
export type Unit = "inr" | "count";
const unitFmt = (u: Unit) => (u === "inr" ? fmtINR : (n: number) => Math.round(n).toLocaleString("en-IN"));

const W = 720;
const H = 280;
const M = { l: 72, r: 10, t: 12, b: 28 };
const PW = W - M.l - M.r;
const PH = H - M.t - M.b;

// Axis max = 4 equal steps, each a "round" number (1, 1.5, 2, 2.5, 3, 4, 5, 6, 8 x 10^k).
function niceMax(v: number, integer = false) {
  if (v <= 0) return 4;
  const target = v / 4;
  const k = Math.floor(Math.log10(target));
  for (const e of [k, k + 1]) {
    for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8]) {
      const step = m * Math.pow(10, e);
      if (integer && !Number.isInteger(step)) continue;
      if (step >= target) return step * 4;
    }
  }
  return Math.ceil(target) * 4;
}
const shortLabel = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
};

export function Legend({ series }: { series: Series[] }) {
  if (series.length < 2) return null;
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold text-slate-600">
      {series.map((s) => (
        <li key={s.name} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} />
          {s.name}
        </li>
      ))}
    </ul>
  );
}

export function ChartCard({ title, subtitle, children, right }: { title: string; subtitle?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="viz-root rounded-3xl border border-slate-200/80 bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Axes({ max, ticks, format, labels, every }: { max: number; ticks: number; format: (n: number) => string; labels: string[]; every: number }) {
  const band = PW / labels.length;
  return (
    <g>
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = (max / ticks) * i;
        const y = M.t + PH - (v / max) * PH;
        return (
          <g key={i}>
            <line x1={M.l} x2={W - M.r} y1={y} y2={y} stroke="currentColor" className="text-slate-200" strokeWidth={1} />
            <text x={M.l - 8} y={y + 4} textAnchor="end" className="fill-slate-400" fontSize={10}>
              {format(v)}
            </text>
          </g>
        );
      })}
      {labels.map((l, i) =>
        i % every === 0 ? (
          <text key={l} x={M.l + band * i + band / 2} y={H - 8} textAnchor="middle" className="fill-slate-400" fontSize={11}>
            {shortLabel(l)}
          </text>
        ) : null
      )}
    </g>
  );
}

function Tooltip({ idx, labels, rows, total, format }: { idx: number; labels: string[]; rows: { name: string; color: string; value: number }[]; total?: boolean; format: (n: number) => string }) {
  const band = 100 / labels.length;
  const left = ((idx + 0.5) * band) ;
  const flip = left > 60;
  const sum = rows.reduce((a, r) => a + r.value, 0);
  return (
    <div
      className="pointer-events-none absolute top-2 z-10 min-w-[160px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lift"
      style={{ left: `${left}%`, transform: flip ? "translateX(calc(-100% - 12px))" : "translateX(12px)" }}
    >
      <p className="mb-1 font-bold text-ink">{shortLabel(labels[idx])}</p>
      {rows.map((r) => (
        <p key={r.name} className="flex items-center justify-between gap-4 text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-[2px]" style={{ background: r.color }} />
            {r.name}
          </span>
          <b className="tabular-nums text-ink">{format(r.value)}</b>
        </p>
      ))}
      {total && rows.length > 1 && (
        <p className="mt-1 flex justify-between gap-4 border-t border-slate-100 pt-1 font-bold text-ink">
          <span>Total</span>
          <span className="tabular-nums">{format(sum)}</span>
        </p>
      )}
    </div>
  );
}

/** Stacked columns over time. values[s][i] = series s on day i. */
export function StackedColumns({ labels, series, values, unit = "inr" }: { labels: string[]; series: Series[]; values: number[][]; unit?: Unit }) {
  const format = unitFmt(unit);
  const [hover, setHover] = useState<number | null>(null);
  const totals = labels.map((_, i) => series.reduce((s, _x, k) => s + values[k][i], 0));
  const max = niceMax(Math.max(...totals, 1));
  const band = PW / labels.length;
  const bw = Math.max(3, Math.min(28, band * 0.68));
  const every = Math.ceil(labels.length / 8);

  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <Legend series={series} />
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Stacked columns">
          <Axes max={max} ticks={4} format={(n) => (n === 0 ? "0" : fmtINR(n))} labels={labels} every={every} />
          {labels.map((_, i) => {
            const x = M.l + band * i + (band - bw) / 2;
            let y = M.t + PH;
            const parts = series.map((s, k) => ({ s, v: values[k][i] })).filter((p) => p.v > 0);
            return (
              <g key={i} opacity={hover === null || hover === i ? 1 : 0.45}>
                {parts.map((p, pi) => {
                  const h = (p.v / max) * PH;
                  y -= h;
                  const isTop = pi === parts.length - 1;
                  const gap = pi > 0 ? 2 : 0; // 2px surface gap between segments
                  const top = y;
                  const hh = Math.max(1, h - gap);
                  const r = isTop ? Math.min(4, bw / 2, hh) : 0;
                  const d = `M${x},${top + hh} L${x},${top + r} Q${x},${top} ${x + r},${top} L${x + bw - r},${top} Q${x + bw},${top} ${x + bw},${top + r} L${x + bw},${top + hh} Z`;
                  return <path key={p.s.name} d={d} fill={p.s.color} />;
                })}
              </g>
            );
          })}
          {labels.map((_, i) => (
            <rect key={i} x={M.l + band * i} y={M.t} width={band} height={PH} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} />
          ))}
        </svg>
        {hover !== null && (
          <Tooltip idx={hover} labels={labels} format={format} total rows={series.map((s, k) => ({ name: s.name, color: s.color, value: values[k][hover] })).filter((r) => r.value > 0)} />
        )}
      </div>
      <DataTable labels={labels} series={series} values={values} format={format} />
    </div>
  );
}

/** Multi-line over time with crosshair + tooltip. */
export function MultiLine({ labels, series, values, unit = "count" }: { labels: string[]; series: Series[]; values: number[][]; unit?: Unit }) {
  const format = unitFmt(unit);
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...values.flat(), 1), true);
  const band = PW / labels.length;
  const x = (i: number) => M.l + band * i + band / 2;
  const y = (v: number) => M.t + PH - (v / max) * PH;
  const every = Math.ceil(labels.length / 8);

  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <Legend series={series} />
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Line chart">
          <Axes max={max} ticks={4} format={(n) => String(Math.round(n))} labels={labels} every={every} />
          {series.map((s, k) => (
            <polyline
              key={s.name}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              points={values[k].map((v, i) => `${x(i)},${y(v)}`).join(" ")}
            />
          ))}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={M.t} y2={M.t + PH} stroke="currentColor" className="text-slate-300" strokeDasharray="3 3" />
              {series.map((s, k) => (
                <circle key={s.name} cx={x(hover)} cy={y(values[k][hover])} r={4} fill={s.color} stroke="white" strokeWidth={2} />
              ))}
            </g>
          )}
          {labels.map((_, i) => (
            <rect key={i} x={M.l + band * i} y={M.t} width={band} height={PH} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} />
          ))}
        </svg>
        {hover !== null && <Tooltip idx={hover} labels={labels} format={format} rows={series.map((s, k) => ({ name: s.name, color: s.color, value: values[k][hover] }))} />}
      </div>
      <DataTable labels={labels} series={series} values={values} format={format} />
    </div>
  );
}

/** Horizontal bars: label, track, value. One color per chart (or per item). */
export function HBars({ items, unit = "count", empty = "No data in this period." }: { items: { label: string; sub?: string; value: number; color?: string }[]; unit?: Unit; empty?: string }) {
  const format = unitFmt(unit);
  const max = Math.max(...items.map((i) => i.value), 1);
  if (items.length === 0 || items.every((i) => i.value === 0)) return <p className="py-6 text-center text-sm text-slate-400">{empty}</p>;
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-semibold text-ink">
              {i.label}
              {i.sub && <span className="ml-1.5 text-xs font-medium text-slate-400">{i.sub}</span>}
            </span>
            <span className="shrink-0 font-bold tabular-nums text-ink">{format(i.value)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-r-md rounded-l-sm bg-slate-100">
            <div className="h-full rounded-r-md" style={{ width: `${Math.max(2, (i.value / max) * 100)}%`, background: i.color ?? "var(--viz-1)" }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Tiny trend line for KPI tiles. */
export function Sparkline({ values, color = "var(--viz-1)" }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1);
  const w = 120;
  const h = 32;
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * w},${h - 3 - (v / max) * (h - 6)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-28" aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Kpi({ label, value, prev, current, spark, hint }: { label: string; value: string; prev?: number; current?: number; spark?: number[]; hint?: string }) {
  let delta: ReactNode = null;
  if (prev !== undefined && current !== undefined) {
    if (prev === 0) delta = current > 0 ? <span className="text-emerald-700">new this period</span> : <span className="text-slate-400">no change</span>;
    else {
      const pct = Math.round(((current - prev) / prev) * 100);
      delta = (
        <span className={pct >= 0 ? "text-emerald-700" : "text-rose-700"}>
          {pct >= 0 ? "▲" : "▼"} {Math.abs(pct)}% vs previous period
        </span>
      );
    }
  }
  return (
    <div className="viz-root rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="font-display text-3xl font-semibold tabular-nums text-ink">{value}</p>
        {spark && <Sparkline values={spark} />}
      </div>
      <p className="mt-1 text-xs font-semibold">{delta ?? <span className="text-slate-400">{hint}</span>}</p>
    </div>
  );
}

function DataTable({ labels, series, values, format }: { labels: string[]; series: Series[]; values: number[][]; format: (n: number) => string }) {
  return (
    <details className="mt-3 text-xs text-slate-500">
      <summary className="cursor-pointer font-semibold hover:text-ink">View as table</summary>
      <div className="mt-2 max-h-60 overflow-auto rounded-lg border border-slate-100">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-slate-50 text-slate-400">
            <tr>
              <th className="px-2 py-1.5">Date</th>
              {series.map((s) => (
                <th key={s.name} className="px-2 py-1.5">
                  {s.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((l, i) => (
              <tr key={l} className="border-t border-slate-100">
                <td className="px-2 py-1">{shortLabel(l)}</td>
                {series.map((s, k) => (
                  <td key={s.name} className="px-2 py-1 tabular-nums">
                    {format(values[k][i])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
