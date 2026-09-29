"use client";

import { useState } from "react";

export function AcresAppDownload() {
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length >= 10) {
      setSent(true);
      setTimeout(() => setSent(false), 4000);
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#003b6d] via-[#0054a6] to-[#0074d9] p-8 sm:p-12 text-white shadow-xl">
        {/* Ambient background glows */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="relative grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Left Text & Form */}
          <div className="md:col-span-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-bold text-amber-300">
              <span>📱</span> Rated 4.6 ★ by 250K+ Home Buyers
            </div>

            <h2 className="mt-3 text-2xl sm:text-4xl font-black text-white tracking-tight">
              Download India&apos;s #1 Real Estate App
            </h2>

            <p className="mt-2 text-xs sm:text-sm text-blue-100 max-w-xl font-normal leading-relaxed">
              Get instant alerts for new property listings, unlock channel partner contact details with QR code scanner, and track live site visit dispatch on your phone.
            </p>

            {/* SMS Link Input Form */}
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-md">
              <div className="flex flex-1 items-center bg-white rounded-xl px-3 py-2 text-slate-800 shadow-sm">
                <span className="text-xs font-bold text-slate-400 mr-2 border-r border-slate-200 pr-2">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 10 digit mobile number"
                  className="w-full bg-transparent text-xs font-semibold focus:outline-none placeholder:text-slate-400"
                />
              </div>
              <button
                type="submit"
                disabled={sent}
                className="rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.98] px-5 py-2.5 text-xs font-black text-slate-950 transition shadow-sm whitespace-nowrap"
              >
                {sent ? "✓ Link Sent!" : "Get Download Link"}
              </button>
            </form>

            {/* Badges Row */}
            <div className="mt-6 flex items-center gap-4 text-xs font-bold text-white/90">
              <div className="flex items-center gap-2 rounded-lg bg-black/30 border border-white/10 px-3 py-1.5 backdrop-blur-xs">
                <span>🤖</span> Google Play Store
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-black/30 border border-white/10 px-3 py-1.5 backdrop-blur-xs">
                <span>🍎</span> Apple App Store
              </div>
            </div>
          </div>

          {/* Right Phone Mockup / QR Container */}
          <div className="md:col-span-4 flex justify-center md:justify-end">
            <div className="rounded-2xl bg-white p-5 text-slate-900 shadow-2xl text-center max-w-[200px] border border-white/20">
              <div className="aspect-square bg-slate-100 rounded-xl flex items-center justify-center p-3 border border-slate-200">
                {/* SVG QR Code Illustration */}
                <svg viewBox="0 0 100 100" className="w-full h-full text-slate-900" fill="currentColor">
                  {/* Top-left position block */}
                  <rect x="10" y="10" width="25" height="25" rx="3" fill="#0054a6" />
                  <rect x="15" y="15" width="15" height="15" rx="1" fill="white" />
                  <rect x="18" y="18" width="9" height="9" fill="#0054a6" />
                  {/* Top-right position block */}
                  <rect x="65" y="10" width="25" height="25" rx="3" fill="#0054a6" />
                  <rect x="70" y="15" width="15" height="15" rx="1" fill="white" />
                  <rect x="73" y="18" width="9" height="9" fill="#0054a6" />
                  {/* Bottom-left position block */}
                  <rect x="10" y="65" width="25" height="25" rx="3" fill="#0054a6" />
                  <rect x="15" y="70" width="15" height="15" rx="1" fill="white" />
                  <rect x="18" y="73" width="9" height="9" fill="#0054a6" />
                  {/* Random QR elements */}
                  <rect x="42" y="12" width="6" height="6" />
                  <rect x="52" y="18" width="6" height="6" />
                  <rect x="42" y="28" width="6" height="6" />
                  <rect x="12" y="42" width="6" height="6" />
                  <rect x="22" y="48" width="6" height="6" />
                  <rect x="45" y="45" width="10" height="10" fill="#0054a6" />
                  <rect x="65" y="42" width="6" height="6" />
                  <rect x="78" y="52" width="6" height="6" />
                  <rect x="42" y="65" width="6" height="6" />
                  <rect x="52" y="78" width="6" height="6" />
                  <rect x="68" y="68" width="8" height="8" />
                  <rect x="80" y="80" width="8" height="8" />
                </svg>
              </div>
              <p className="mt-2.5 text-xs font-black text-slate-800">Scan to Download</p>
              <p className="text-[10px] font-semibold text-slate-400">iOS & Android</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
