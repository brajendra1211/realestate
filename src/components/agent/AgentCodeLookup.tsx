"use client";

import { useState } from "react";

type AgentLookupResult = {
  id: string;
  agentCode: string;
  name: string;
  shopName: string | null;
  city: string | null;
  phone: string;
  whatsapp: string;
  email: string | null;
  verified: boolean;
  primeStatus: boolean;
  ratingAvg: number;
};

export function AgentCodeLookup() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AgentLookupResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/agent/lookup?code=${encodeURIComponent(code.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Channel Partner not found");
      }
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to find channel partner");
    } finally {
      setLoading(false);
    }
  }

  function handleCopyCode(codeToCopy: string) {
    navigator.clipboard.writeText(codeToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            🔍 Channel Partner Directory & Quick Connect
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kisi bhi Channel Partner ka code daal kar baat karne ke liye unka verified number nikaalein ya WhatsApp karein.
          </p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="mt-4 flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Enter Channel Partner Code (e.g. AGT-1024)"
          className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-mono font-medium uppercase tracking-wide focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? (
            <span>Searching...</span>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
              Find Channel Partner
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/30 p-4 transition-all animate-fadeIn">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyCode(result.agentCode)}
                  title="Click to copy code"
                  className="group inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-mono font-bold text-blue-700 border border-blue-200 shadow-xs hover:border-blue-400 active:scale-95 transition"
                >
                  <span>{result.agentCode}</span>
                  <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 text-slate-400 group-hover:text-blue-600">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                {copied && <span className="text-[11px] font-semibold text-emerald-600">Copied!</span>}
                {result.verified && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    Verified Agent
                  </span>
                )}
                {result.primeStatus && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    ★ Prime
                  </span>
                )}
              </div>
              <h3 className="mt-1.5 text-base font-bold text-slate-900">{result.name}</h3>
              <p className="text-xs text-slate-500">
                {result.shopName ? `${result.shopName} · ` : ""}
                {result.city || "India"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {result.phone && (
                <a
                  href={`tel:${result.phone}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Call ({result.phone})
                </a>
              )}
              {result.whatsapp && (
                <a
                  href={`https://wa.me/91${result.whatsapp.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(
                    `Namaste ${result.name} ji, I am connecting with you regarding real estate property collaboration via BayaEstate.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#20ba59] active:scale-95 transition"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.91-9.91-9.91zm0 18.16c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31c-.82-1.31-1.26-2.83-1.26-4.39 0-4.54 3.7-8.24 8.25-8.24 4.54 0 8.24 3.7 8.24 8.24 0 4.54-3.7 8.25-8.24 8.25zm4.52-6.17c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.3z" />
                  </svg>
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
