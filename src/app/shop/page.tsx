import { redirect } from "next/navigation";
import Link from "next/link";

async function lookupAgentShop(formData: FormData) {
  "use server";
  const code = formData.get("agentCode")?.toString().trim();
  if (code) {
    redirect(`/shop/${encodeURIComponent(code.toUpperCase())}`);
  }
}

export default async function ShopPortalPage() {
  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 text-white">
      <div className="mx-auto max-w-xl">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold text-blue-300 border border-blue-400/30">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Verified Agent Digital Storefronts
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl text-white">
            Scan or Enter Agent QR Code
          </h1>
          <p className="mt-3 text-sm text-slate-300 leading-relaxed">
            Have you scanned an Agent&apos;s shop standee QR or been given an Agent Code?
            Enter it below to pay the ₹50 one-time access fee and unlock their verified properties & direct contact numbers.
          </p>
        </div>

        {/* Form Card */}
        <div className="mt-8 rounded-3xl border border-slate-700 bg-slate-800/90 p-6 shadow-2xl backdrop-blur-md">
          <form action={lookupAgentShop} className="space-y-4">
            <div>
              <label htmlFor="agentCode" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Agent Code (from QR code)
              </label>
              <div className="mt-1.5 relative">
                <input
                  type="text"
                  id="agentCode"
                  name="agentCode"
                  required
                  placeholder="e.g. AGT-BLR-1000"
                  className="w-full rounded-2xl border-2 border-slate-600 bg-slate-900/80 px-4 py-3.5 text-base font-mono font-bold text-white placeholder-slate-500 uppercase tracking-wider focus:border-amber-400 focus:outline-none transition"
                />
                <div className="absolute right-3.5 top-3.5 text-slate-400">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-amber-500 py-3.5 text-sm font-black text-slate-950 shadow-lg transition hover:bg-amber-400 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <span>💳</span> Open Agent Storefront & Unlock (₹50)
            </button>
          </form>

          {/* Quick Demo Agent Code link */}
          <div className="mt-5 border-t border-slate-700/80 pt-4 text-center">
            <span className="text-xs text-slate-400">Quick Test Agent: </span>
            <Link
              href="/shop/AGT-BLR-1000"
              className="font-mono text-xs font-bold text-amber-400 underline hover:text-amber-300"
            >
              AGT-BLR-1000
            </Link>
          </div>
        </div>

        {/* Benefits breakdown */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-800/40 p-4 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
              ⚡
            </div>
            <h3 className="mt-2 text-xs font-bold text-white">Instant ₹50 Unlock</h3>
            <p className="mt-1 text-[11px] text-slate-400 leading-normal">
              Razorpay secure checkout. 1-click unlock for the entire shop.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-800/40 p-4 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              👤
            </div>
            <h3 className="mt-2 text-xs font-bold text-white">Verified Agent On Top</h3>
            <p className="mt-1 text-[11px] text-slate-400 leading-normal">
              Direct phone & WhatsApp buttons with office verification.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-800/40 p-4 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
              🏠
            </div>
            <h3 className="mt-2 text-xs font-bold text-white">All Properties Below</h3>
            <p className="mt-1 text-[11px] text-slate-400 leading-normal">
              Browse full inventory with INR pricing, photos & exact specs.
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-xs text-slate-400 hover:text-white transition">
            ← Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
