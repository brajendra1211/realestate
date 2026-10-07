import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-50 px-4 py-16 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-2xl w-full text-center">
        {/* Visual Badge */}
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-blue-50 border border-blue-100 shadow-sm text-blue-600 mb-8 mx-auto animate-bounce-slow">
          <svg
            className="w-12 h-12 text-[#0054a6]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        </div>

        {/* 404 Headline */}
        <div className="inline-block px-3 py-1 rounded-full bg-blue-100 text-[#0054a6] text-xs font-black tracking-wider uppercase mb-3">
          Error 404 • Page Not Found
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-4">
          Looking for a property that moved?
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-lg mx-auto mb-8 leading-relaxed">
          The link you followed might be broken, or the property has been sold and taken off the market. Let’s get you back on track!
        </p>

        {/* Primary CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#0054a6] hover:bg-[#003b6d] text-white font-bold text-sm shadow-md shadow-blue-600/20 transition-all hover:scale-105"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3" />
            </svg>
            Back to Homepage
          </Link>

          <Link
            href="/properties"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-sm shadow-xs transition hover:border-slate-400"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Explore Properties
          </Link>
        </div>

        {/* Quick Shortcut Links */}
        <div className="pt-8 border-t border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
            Popular Destinations
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <Link
              href="/register"
              className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition"
            >
              Post Free Property 🏡
            </Link>
            <Link
              href="/register/agent"
              className="px-3.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-700 transition"
            >
              Channel Partner 🤝
            </Link>
            <Link
              href="/buyer/login"
              className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition"
            >
              Buyer Login 🔑
            </Link>
            <Link
              href="/projects"
              className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition"
            >
              New Projects 🏗️
            </Link>
            <Link
              href="/health"
              className="px-3.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-xs font-semibold text-blue-700 transition"
            >
              System Status ⚡
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
