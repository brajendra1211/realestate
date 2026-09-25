"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SearchBar } from "./SearchBar";
import { NearMeButton } from "./NearMeButton";

const SLIDES = [
  {
    badge: "✨ ULTRA-LUXURY COLLECTION",
    badgeColor: "bg-emerald-500/15 text-emerald-700 border-emerald-400/30",
    glowColor: "from-emerald-500/20 via-teal-500/15 to-transparent",
    titlePrefix: "Discover Architectural Masterpieces & ",
    titleHighlight: "Exclusive Penthouses",
    highlightGradient: "from-emerald-600 via-teal-600 to-cyan-600",
    subtitle:
      "Handpicked gated communities, designer villas, and sea-facing sky suites vetted for discerning homeowners.",
    tags: [
      { label: "🏊 Private Pool Villas", href: "/properties?propertyType=VILLA" },
      { label: "🏙️ Sky Penthouses", href: "/properties?propertyType=APARTMENT" },
      { label: "🌳 Eco Townships", href: "/properties" },
    ],
  },
  {
    badge: "⚡ 100% DIRECT CHANNEL PARTNERS",
    badgeColor: "bg-blue-500/15 text-blue-700 border-blue-400/30",
    glowColor: "from-blue-500/20 via-indigo-500/15 to-transparent",
    titlePrefix: "Direct Access to Verified Partners With ",
    titleHighlight: "Zero Broker Spam",
    highlightGradient: "from-blue-600 via-indigo-600 to-purple-600",
    subtitle:
      "Scan an agent's QR standee with ₹50 instant unlock to view complete property inventory and direct WhatsApp numbers.",
    tags: [
      { label: "📱 QR Code Standees", href: "/shop" },
      { label: "🔒 Instant ₹50 Unlock", href: "/shop" },
      { label: "🚀 Uber-Style Cascade Dispatch", href: "/properties" },
    ],
  },
  {
    badge: "📈 HIGH-YIELD ASSETS & LAND",
    badgeColor: "bg-amber-500/15 text-amber-800 border-amber-400/30",
    glowColor: "from-amber-500/20 via-orange-500/15 to-transparent",
    titlePrefix: "Pre-Leased Commercial Assets & ",
    titleHighlight: "High-ROI Land Deals",
    highlightGradient: "from-amber-600 via-orange-600 to-rose-600",
    subtitle:
      "Grade-A IT parks, high-footfall retail units, and strategic residential plots with 100% verified legal clearance.",
    tags: [
      { label: "🏢 Grade-A Commercial", href: "/properties?propertyType=COMMERCIAL" },
      { label: "🛍️ High-Street Retail", href: "/properties?propertyType=OFFICE" },
      { label: "📜 RERA Clear Title Plots", href: "/properties?propertyType=PLOT" },
    ],
  },
  {
    badge: "🏡 CURATED RENTALS & RESIDENCES",
    badgeColor: "bg-purple-500/15 text-purple-700 border-purple-400/30",
    glowColor: "from-purple-500/20 via-pink-500/15 to-transparent",
    titlePrefix: "Bespoke Furnished Rentals With ",
    titleHighlight: "Seamless Onboarding",
    highlightGradient: "from-purple-600 via-pink-600 to-indigo-600",
    subtitle:
      "Fully serviced luxury apartments and independent houses ready for immediate possession with transparent agreements.",
    tags: [
      { label: "🛋️ Fully Furnished", href: "/properties?listingType=RENT" },
      { label: "⚡ Same-Day Move-In", href: "/properties?listingType=RENT" },
      { label: "🛡️ Verified Owners Only", href: "/properties" },
    ],
  },
];

export function HeroSlider({
  propertyCount,
  agentCount,
  cityCount,
}: {
  propertyCount: number;
  agentCount: number;
  cityCount: number;
}) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % SLIDES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const slide = SLIDES[current];

  return (
    <section
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative overflow-hidden border-b border-slate-200/90 bg-linear-to-b from-white via-slate-50/60 to-white px-4 py-16 text-center sm:px-6 sm:py-24"
    >
      {/* Dynamic Animated Ambient Glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden transition-all duration-1000">
        <div
          className={`absolute -left-28 -top-28 h-[550px] w-[550px] rounded-full bg-linear-to-br ${slide.glowColor} blur-3xl opacity-70 transition-all duration-1000`}
        />
        <div className="absolute -right-28 top-12 h-[550px] w-[550px] rounded-full bg-linear-to-bl from-blue-500/15 via-indigo-500/10 to-transparent blur-3xl opacity-70" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[380px] w-[700px] rounded-full bg-linear-to-t from-amber-500/15 via-rose-500/10 to-transparent blur-3xl opacity-60" />
      </div>

      <div className="relative mx-auto max-w-4xl">
        {/* Slide Indicator Dots + Badge Row */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-black tracking-wide shadow-xs backdrop-blur-md transition-all duration-500 ${slide.badgeColor}`}
          >
            <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
            {slide.badge}
          </div>

          <div className="flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 border border-slate-200/80 shadow-xs">
            {SLIDES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrent(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  current === idx ? "w-6 bg-slate-900" : "w-2 bg-slate-300 hover:bg-slate-400"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Dynamic Animated Headline */}
        <div className="min-h-[140px] sm:min-h-[160px] flex items-center justify-center mt-6">
          <h1
            key={current}
            className="animate-fadeIn max-w-3xl text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.15]"
          >
            {slide.titlePrefix}
            <span
              className={`bg-linear-to-r ${slide.highlightGradient} bg-clip-text text-transparent`}
            >
              {slide.titleHighlight}
            </span>
          </h1>
        </div>

        {/* Dynamic Subtitle */}
        <p
          key={`sub-${current}`}
          className="animate-fadeIn mx-auto max-w-2xl text-sm sm:text-base text-slate-600 leading-relaxed font-medium"
        >
          {slide.subtitle}
        </p>

        {/* Quick Filter Tags from Slide */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {slide.tags.map((tag) => (
            <Link
              key={tag.label}
              href={tag.href}
              className="inline-flex items-center rounded-xl border border-slate-200/90 bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs backdrop-blur-xs transition hover:border-slate-400 hover:bg-slate-50 hover:scale-[1.02]"
            >
              {tag.label}
            </Link>
          ))}
        </div>

        {/* Elevated Luxury Search Bar */}
        <div className="mt-8">
          <SearchBar />
        </div>

        {/* Actions row: Near Me & All Properties */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <NearMeButton className="inline-flex items-center gap-2 rounded-full border border-slate-300/90 bg-white px-5 py-2.5 text-xs font-bold text-slate-800 shadow-xs transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60" />
          <Link
            href="/properties"
            className="inline-flex items-center gap-1.5 rounded-full bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-500/20 transition hover:brightness-110"
          >
            <span>Explore All Properties</span>
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* 3 Colorful Stats Cards */}
        <div className="mx-auto mt-12 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="group rounded-2xl border border-blue-200/80 bg-linear-to-br from-blue-50/70 via-white to-indigo-50/40 p-4 shadow-xs backdrop-blur-xs transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black text-blue-900 sm:text-3xl tracking-tight">
                {propertyCount.toLocaleString("en-IN")}+
              </p>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-600 text-sm">
                🏢
              </span>
            </div>
            <p className="mt-1 text-xs font-bold text-blue-700 uppercase tracking-wider">
              Active Properties
            </p>
          </div>

          <div className="group rounded-2xl border border-emerald-200/80 bg-linear-to-br from-emerald-50/70 via-white to-teal-50/40 p-4 shadow-xs backdrop-blur-xs transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black text-emerald-900 sm:text-3xl tracking-tight">
                {agentCount.toLocaleString("en-IN")}+
              </p>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 text-sm">
                ⭐
              </span>
            </div>
            <p className="mt-1 text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Prime Channel Partners
            </p>
          </div>

          <div className="group rounded-2xl border border-amber-200/80 bg-linear-to-br from-amber-50/70 via-white to-orange-50/40 p-4 shadow-xs backdrop-blur-xs transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black text-amber-900 sm:text-3xl tracking-tight">
                {cityCount.toLocaleString("en-IN")}+
              </p>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700 text-sm">
                📍
              </span>
            </div>
            <p className="mt-1 text-xs font-bold text-amber-700 uppercase tracking-wider">
              Cities Covered
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
