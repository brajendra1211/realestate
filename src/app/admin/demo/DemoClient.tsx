"use client";

import { useEffect, useRef, useState } from "react";

type Agent = { id: string; code: string; name: string; area: string; pincode: string; km: number };

const AGENTS: Agent[] = [
  { id: "a1", code: "AGT-BLR-1000", name: "Ravi Kumar", area: "Indiranagar", pincode: "560038", km: 0.8 },
  { id: "a2", code: "AGT-BLR-1001", name: "Sneha Rao", area: "Indiranagar", pincode: "560038", km: 1.5 },
  { id: "a3", code: "AGT-BLR-1002", name: "Imran Khan", area: "Koramangala", pincode: "560034", km: 6 },
  { id: "a4", code: "AGT-BLR-1003", name: "Priya Nair", area: "HSR Layout", pincode: "560102", km: 12 },
  { id: "a5", code: "AGT-BLR-1004", name: "Arjun Mehta", area: "Whitefield", pincode: "560066", km: 22 },
];

const TABS = ["🔔 Buzzer", "🏠 Property listing", "💰 Commission"] as const;
type Mode = "phases" | "selected" | "area" | "direct";

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

function Phone({ agent, ringing, got }: { agent: Agent; ringing: boolean; got: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-3 text-center text-sm transition ${
        ringing ? "animate-pulse border-amber-400 bg-amber-50 shadow-lg shadow-amber-200" : got ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white opacity-60"
      }`}
    >
      <div className="text-3xl">{ringing ? "📳" : got ? "✅" : "📱"}</div>
      <p className="mt-1 font-semibold text-ink">{agent.name}</p>
      <p className="font-mono text-[11px] text-slate-500">{agent.code}</p>
      <p className="text-[11px] text-slate-400">
        {agent.area} · {agent.km} km
      </p>
      {ringing && <p className="mt-1 text-xs font-bold text-amber-700">New buyer lead! Accept now</p>}
    </div>
  );
}

function BuzzerDemo() {
  const [mode, setMode] = useState<Mode>("phases");
  const [picked, setPicked] = useState<string[]>(["a1", "a3"]);
  const [pincode, setPincode] = useState("560038");
  const [direct, setDirect] = useState("a2");
  const [ringing, setRinging] = useState<string[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const ring = (ids: string[]) => {
    setRinging((r) => [...new Set([...r, ...ids])]);
    setSeen((s) => [...new Set([...s, ...ids])]);
  };

  const start = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRinging([]);
    setSeen([]);
    if (mode === "phases") {
      // Demo runs the real timeline 10x faster (0s / 1s / 6s / 18s instead of 0s / 10s / 60s / 180s).
      setNote("Automatic: listing agent first → 5 km → 15 km → everyone (demo runs 10× faster).");
      ring(["a1"]);
      timers.current.push(setTimeout(() => ring(AGENTS.filter((a) => a.km <= 5).map((a) => a.id)), 1000));
      timers.current.push(setTimeout(() => ring(AGENTS.filter((a) => a.km <= 15).map((a) => a.id)), 6000));
      timers.current.push(setTimeout(() => ring(AGENTS.map((a) => a.id)), 18000));
    } else if (mode === "selected") {
      setNote("Admin picked these agents. ONLY they ring — nobody else is disturbed.");
      ring(picked);
    } else if (mode === "area") {
      const hit = AGENTS.filter((a) => a.pincode === pincode.trim()).map((a) => a.id);
      setNote(hit.length ? `Only agents mapped to pincode ${pincode} ring.` : `No agent is mapped to ${pincode}.`);
      ring(hit);
    } else {
      setNote("Lead handed straight to one agent. No buzzer rings for anyone else.");
      setSeen([direct]);
      setRinging([]);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["phases", "Automatic (by distance)"],
            ["selected", "Selected agents"],
            ["area", "By area / pincode"],
            ["direct", "Direct lead (no buzzer)"],
          ] as [Mode, string][]
        ).map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setMode(k)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${mode === k ? "bg-brand-600 text-white" : "border border-slate-200 bg-white text-slate-600"}`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
        <b>Buyer lead:</b> 2 BHK apartment for rent · Indiranagar, Bengaluru · ₹35,000/mo — buyer just paid ₹100 to unlock it.
      </div>

      {mode === "selected" && (
        <div className="flex flex-wrap gap-3 text-sm">
          {AGENTS.map((a) => (
            <label key={a.id} className="flex items-center gap-2">
              <input type="checkbox" checked={picked.includes(a.id)} onChange={() => setPicked((p) => (p.includes(a.id) ? p.filter((x) => x !== a.id) : [...p, a.id]))} />
              {a.name}
            </label>
          ))}
        </div>
      )}
      {mode === "area" && (
        <input value={pincode} onChange={(e) => setPincode(e.target.value)} className="w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Pincode" />
      )}
      {mode === "direct" && (
        <select value={direct} onChange={(e) => setDirect(e.target.value)} className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm">
          {AGENTS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.code})
            </option>
          ))}
        </select>
      )}

      <button type="button" onClick={start} className="rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-white">
        {mode === "direct" ? "Send lead" : "▶ Ring the buzzer"}
      </button>
      {note && <p className="text-sm font-medium text-slate-600">{note}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {AGENTS.map((a) => (
          <Phone key={a.id} agent={a} ringing={ringing.includes(a.id) && mode !== "direct"} got={seen.includes(a.id)} />
        ))}
      </div>
      <p className="text-xs text-slate-400">The first agent to accept gets the buyer&apos;s number (up to 5 agents can take one buyer).</p>
    </div>
  );
}

function ListingDemo() {
  const steps = [
    ["1", "Agent lists the property", "Agent adds photos, price and address. The system gives it a Master Property ID (property code)."],
    ["2", "Admin approves it", "Listing goes live on the website under the agent's code."],
    ["3", "Buyer pays ₹100 to unlock", "Buyer sees the exact address and contact for that property."],
    ["4", "Buzzer rings", "The listing's own agent rings first, then nearby agents, so no lead is missed."],
    ["5", "Agent shows the property", "The visit is logged with the customer's OTP, so everyone knows who showed what."],
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Live · Verified</p>
        <h3 className="mt-1 text-xl font-bold text-ink">2 BHK Apartment, Indiranagar</h3>
        <p className="text-sm text-slate-500">Bengaluru · 1,150 sq ft · Furnished</p>
        <p className="mt-3 text-2xl font-bold text-brand-700">₹35,000 / month</p>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div><dt className="text-xs text-slate-400">Property code</dt><dd className="font-mono font-semibold">MP-BLR-2001</dd></div>
          <div><dt className="text-xs text-slate-400">Listed by</dt><dd className="font-mono font-semibold">AGT-BLR-1000</dd></div>
        </dl>
        <button type="button" className="mt-4 w-full rounded-xl bg-gold-400 py-2.5 text-sm font-bold text-ink">Unlock details · ₹100</button>
      </div>
      <ol className="space-y-3">
        {steps.map(([n, t, d]) => (
          <li key={n} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{n}</span>
            <div>
              <p className="font-semibold text-ink">{t}</p>
              <p className="text-sm text-slate-500">{d}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function CommissionDemo() {
  const [value, setValue] = useState(10000000);
  const [profit, setProfit] = useState(500000);
  const brokerage = value * 0.01;
  const rest = profit * 0.8;
  const rows: [string, string, string][] = [
    ["Buyer's agent brokerage", "1% of property value", inr(brokerage)],
    ["Seller's agent brokerage", "1% of property value", inr(brokerage)],
    ["Buyer unlock pass (₹100)", "50% to agent", inr(50)],
    ["Gold self-list (₹500)", "50% to agent", inr(250)],
    ["Referral Partner registration (₹20,000)", "10% to referring agent", inr(2000)],
    ["Joint deal profit share", "10% of profit to agent", inr(profit * 0.1)],
  ];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-4">
        <label className="text-sm font-semibold text-slate-600">
          Property value (₹)
          <input type="number" value={value} onChange={(e) => setValue(Number(e.target.value) || 0)} className="mt-1 block w-52 rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="text-sm font-semibold text-slate-600">
          Joint-deal profit (₹)
          <input type="number" value={profit} onChange={(e) => setProfit(Number(e.target.value) || 0)} className="mt-1 block w-52 rounded-lg border border-slate-300 px-3 py-2" />
        </label>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-slate-400">
            <tr><th className="p-3">Earning</th><th className="p-3">Rule</th><th className="p-3 text-right">Agent gets</th></tr>
          </thead>
          <tbody>
            {rows.map(([a, b, c]) => (
              <tr key={a} className="border-t border-slate-100">
                <td className="p-3 font-semibold">{a}</td>
                <td className="p-3 text-slate-500">{b}</td>
                <td className="p-3 text-right font-bold text-emerald-700">{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        Joint-deal profit split of {inr(profit)}: agent 10% ({inr(profit * 0.1)}) · expenses 10% ({inr(profit * 0.1)}) · referral partner 40% ({inr(rest / 2)}) · company 40% ({inr(rest / 2)}).
        Each earning shows separately in the agent&apos;s dashboard — they are never merged.
      </p>
    </div>
  );
}

export default function DemoClient() {
  const [tab, setTab] = useState(0);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t, i) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(i)}
            className={`rounded-full px-5 py-2 text-sm font-bold ${tab === i ? "bg-ink text-white shadow" : "border border-slate-200 bg-white text-slate-600"}`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 0 && <BuzzerDemo />}
      {tab === 1 && <ListingDemo />}
      {tab === 2 && <CommissionDemo />}
    </div>
  );
}
