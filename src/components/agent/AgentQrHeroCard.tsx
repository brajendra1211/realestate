"use client";

import { useState } from "react";
import Link from "next/link";

type AgentQrHeroCardProps = {
  agentCode: string;
  name: string;
  shopName: string | null;
  shopAddress: string | null;
  city: string | null;
  qrDataUrl: string;
  originUrl: string;
};

export function AgentQrHeroCard({
  agentCode,
  name,
  shopName,
  shopAddress,
  city,
  qrDataUrl,
  originUrl,
}: AgentQrHeroCardProps) {
  const [copied, setCopied] = useState(false);
  const shopUrl = `${originUrl}/shop/${encodeURIComponent(agentCode)}`;

  function handleCopy() {
    navigator.clipboard.writeText(shopUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handleShareWhatsApp() {
    const text = `*REAL ESTATE CONSULTANT - ${shopName || name}*\nAgent Code: *${agentCode}*\n📍 Office: ${shopAddress || city || "Ghaziabad / NCR"}\n\nScan my QR code or open my verified property catalog:\n🔗 ${shopUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div id="my-qr" className="relative overflow-hidden rounded-3xl border-2 border-blue-500/20 bg-linear-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-xl">
      {/* Decorative background glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative flex flex-col md:flex-row items-center gap-6">
        {/* QR Code Frame */}
        <div className="flex flex-col items-center shrink-0">
          <div className="relative rounded-2xl border-4 border-white/90 bg-white p-3 shadow-2xl transition hover:scale-[1.02]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt={`QR Code for ${agentCode}`}
              className="h-44 w-44 object-contain md:h-48 md:w-48"
            />
            <div className="mt-2 text-center">
              <span className="font-mono text-xs font-black tracking-wider text-slate-900">
                {agentCode}
              </span>
            </div>
          </div>
          <span className="mt-2 text-[11px] font-semibold text-blue-200">
            Official Shop Standee QR
          </span>
        </div>

        {/* Content & Actions */}
        <div className="flex-1 text-center md:text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold text-blue-300 border border-blue-400/30">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Verified Channel Partner QR Code
          </div>

          <h2 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
            {shopName || name}
          </h2>

          <p className="mt-1 text-xs text-slate-300">
            {shopAddress ? `${shopAddress}, ` : ""}
            {city || "Ghaziabad / NCR"} · Channel Partner Code:{" "}
            <span className="font-mono font-bold text-amber-400">{agentCode}</span>
          </p>

          <div className="mt-3 rounded-xl bg-white/10 p-3 text-xs text-slate-200 backdrop-blur-xs border border-white/10">
            <p className="leading-relaxed">
              <strong className="text-amber-300">How it works:</strong> Print or download this QR code and place it at your shop/office desk. When any buyer scans it with their phone camera or mobile app, they pay a <strong className="text-white">₹50 unlock fee via Razorpay</strong> and immediately see your verified contact info & all your property listings!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-5 flex flex-wrap items-center gap-2.5 justify-center md:justify-start">
            <Link
              href={`/shop/${encodeURIComponent(agentCode)}`}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md transition hover:bg-amber-400 hover:scale-[1.02]"
            >
              <span>🌐</span> Open Public Shop Preview
            </Link>

            <a
              href={`/api/agent/qr?code=${encodeURIComponent(agentCode)}&format=png&download=true`}
              download={`Shop-QR-${agentCode}.png`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2.5 text-xs font-bold text-white border border-white/20 transition hover:bg-white/25"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PNG
            </a>

            <a
              href={`/api/agent/qr?code=${encodeURIComponent(agentCode)}&format=svg&download=true`}
              download={`Shop-QR-${agentCode}.svg`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2.5 text-xs font-bold text-white border border-white/20 transition hover:bg-white/25"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download SVG
            </a>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2.5 text-xs font-bold text-slate-200 border border-white/15 transition hover:bg-white/20"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copied ? "✓ Copied!" : "Copy Shop Link"}
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-[#20ba59]"
            >
              <span>💬</span> WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
