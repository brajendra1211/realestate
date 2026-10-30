import Link from "next/link";
import { OwnerPortalCard } from "./OwnerPortalCard";

export default async function RegisterPage() {
  return (
    <div className="min-h-[85vh] bg-linear-to-b from-slate-50 via-white to-slate-100/70 py-12 px-4 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-lg mx-auto">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900 text-white shadow-md hover:bg-slate-800 transition-all text-xs font-bold tracking-wide"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-black">
              NP
            </span>
            <span>Noida Prime Properties</span>
          </Link>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
            List Your Property
          </h1>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            Dedicated portal for Property Owners. Post property directly or log in to manage your listings.
          </p>
        </div>

        {/* Owner Portal Card (Post Property / Owner Login) */}
        <OwnerPortalCard />

        {/* Trust Badges */}
        <div className="mt-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2 font-medium">
          <span>🔒 Verified Listings</span>
          <span>•</span>
          <span>Zero Brokerage</span>
          <span>•</span>
          <span>Direct Buyer Connect</span>
        </div>
      </div>
    </div>
  );
}
