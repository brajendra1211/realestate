"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface HealthData {
  status: string;
  live: boolean;
  message: string;
  database: {
    status: string;
    engine?: string;
    latencyMs?: string;
    records?: {
      users: number;
      properties: number;
      cities: number;
    };
    error?: string;
  };
  server: {
    nodeVersion: string;
    environment: string;
    uptimeSeconds?: number;
    timestamp: string;
  };
}

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<string>("");

  const checkHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health");
      const json = await res.json();
      setData(json);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err: any) {
      setData({
        status: "OFFLINE",
        live: false,
        message: "Server is unreachable!",
        database: { status: "UNKNOWN", error: err.message },
        server: { nodeVersion: "N/A", environment: "unknown", timestamp: new Date().toISOString() },
      });
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const isDbOk = data?.database?.status === "CONNECTED";
  const isHealthy = data?.status === "HEALTHY";

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">⚡</span>
                <h1 className="text-2xl font-bold text-slate-900">System & Database Status</h1>
              </div>
              <p className="text-sm text-slate-500">
                Live diagnostics to confirm web server and database connectivity on WHM / cPanel.
              </p>
            </div>
            <button
              onClick={checkHealth}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl shadow-sm transition"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Checking...
                </>
              ) : (
                <>🔄 Refresh Check</>
              )}
            </button>
          </div>
          {lastChecked && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Last checked at: <strong className="text-slate-700">{lastChecked}</strong></span>
              <span className="font-mono text-slate-400">/api/health</span>
            </div>
          )}
        </div>

        {/* Status Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* 1. Database Status */}
          <div className={`rounded-2xl p-6 border shadow-sm ${
            isDbOk ? "bg-emerald-50/50 border-emerald-200" : "bg-rose-50/50 border-rose-200"
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🗄️</span>
                <h2 className="font-bold text-slate-900">Database Connection</h2>
              </div>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                isDbOk ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
              }`}>
                <span className={`w-2 h-2 rounded-full mr-1.5 ${isDbOk ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                {data?.database?.status || "CHECKING"}
              </span>
            </div>

            {isDbOk ? (
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between py-1 border-b border-emerald-100/60">
                  <span className="text-slate-600">Engine</span>
                  <span className="font-semibold text-slate-900">{data?.database?.engine}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-emerald-100/60">
                  <span className="text-slate-600">Query Latency</span>
                  <span className="font-semibold text-emerald-700">{data?.database?.latencyMs}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-emerald-100/60">
                  <span className="text-slate-600">Total Users in DB</span>
                  <span className="font-bold text-slate-900">{data?.database?.records?.users ?? "-"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-emerald-100/60">
                  <span className="text-slate-600">Total Properties in DB</span>
                  <span className="font-bold text-slate-900">{data?.database?.records?.properties ?? "-"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Total Cities in DB</span>
                  <span className="font-bold text-slate-900">{data?.database?.records?.cities ?? "-"}</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-rose-700">
                <p className="font-semibold mb-1">Database connection failed:</p>
                <code className="text-xs bg-rose-100/80 p-2 rounded block break-all font-mono">
                  {data?.database?.error || "Unable to reach database server. Check DATABASE_URL in .env"}
                </code>
              </div>
            )}
          </div>

          {/* 2. Web Server Status */}
          <div className={`rounded-2xl p-6 border shadow-sm ${
            isHealthy ? "bg-blue-50/50 border-blue-200" : "bg-amber-50/50 border-amber-200"
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🚀</span>
                <h2 className="font-bold text-slate-900">Web Server Status</h2>
              </div>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                isHealthy ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"
              }`}>
                <span className={`w-2 h-2 rounded-full mr-1.5 ${isHealthy ? "bg-blue-500 animate-pulse" : "bg-amber-500"}`} />
                {data?.status || "CHECKING"}
              </span>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between py-1 border-b border-blue-100/60">
                <span className="text-slate-600">Environment</span>
                <span className="font-semibold uppercase tracking-wider text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-900">
                  {data?.server?.environment || "development"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-blue-100/60">
                <span className="text-slate-600">Node.js Version</span>
                <span className="font-semibold text-slate-900">{data?.server?.nodeVersion || "-"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-blue-100/60">
                <span className="text-slate-600">Uptime</span>
                <span className="font-semibold text-slate-900">
                  {data?.server?.uptimeSeconds ? `${data.server.uptimeSeconds}s` : "-"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Status Message</span>
                <span className="font-medium text-slate-700 text-right truncate max-w-[180px]">
                  {data?.message}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* WHM Deployment Quick Guide */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
            <span>📋</span> WHM / cPanel Live Verification Guide
          </h3>
          <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside">
            <li>
              Jab aap apne server par deploy karenge, to <strong className="text-slate-800">https://aapki-domain.com/health</strong> open karke dekhein.
            </li>
            <li>
              Agar <span className="text-emerald-700 font-bold">CONNECTED</span> dikhe aur users count aaye, iska matlab aapka server aur MySQL database 100% live aur connected hai!
            </li>
            <li>
              Aap <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">deploy.sh</code> script se GitHub se single command me update kar sakte hain.
            </li>
          </ul>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/"
              className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition"
            >
              ← Back to Homepage
            </Link>
            <Link
              href="/admin"
              className="text-sm font-semibold px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition"
            >
              Open Admin Panel →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
