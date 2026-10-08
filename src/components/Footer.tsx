import Link from "next/link";

export function Footer({
  siteName,
  tagline,
  contactEmail,
  contactPhone,
  contactAddress,
}: {
  siteName: string;
  tagline?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactAddress?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  youtubeUrl?: string | null;
  linkedinUrl?: string | null;
}) {
  const brandTitle = siteName && siteName !== "BayaEstate" ? siteName : "Noida Prime Properties";

  return (
    <footer className="border-t border-slate-200 bg-slate-900 text-slate-400 text-sm">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2 text-white font-extrabold text-lg">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-xs font-black text-white">
                NP
              </span>
              <span>{brandTitle}</span>
            </Link>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              {tagline || "Your premier real estate portal for verified residential, commercial, and luxury properties in Noida, Greater Noida, and Yamuna Expressway."}
            </p>
            <div className="text-xs text-slate-400 space-y-1">
              <p>RERA Registered Real Estate Consultancy</p>
              <p>Sanctioned Plans & Authenticated Ownership Records</p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Explore</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/properties?listingType=SALE" className="hover:text-white transition">Buy Properties</Link>
              </li>
              <li>
                <Link href="/properties?listingType=RENT" className="hover:text-white transition">Rent Homes</Link>
              </li>
              <li>
                <Link href="/projects" className="hover:text-white transition">New Projects</Link>
              </li>
              <li>
                <Link href="/properties?propertyType=COMMERCIAL" className="hover:text-white transition">Commercial Spaces</Link>
              </li>
              <li>
                <Link href="/properties?propertyType=PLOT" className="hover:text-white transition">Plots & Land</Link>
              </li>
            </ul>
          </div>

          {/* Popular Localities */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Top Localities</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/properties?city=Sector+150" className="hover:text-white transition">Sector 150, Noida</Link>
              </li>
              <li>
                <Link href="/properties?city=Sector+128" className="hover:text-white transition">Sector 128 (Wish Town)</Link>
              </li>
              <li>
                <Link href="/properties?city=Sector+43" className="hover:text-white transition">Sector 43, Noida</Link>
              </li>
              <li>
                <Link href="/properties?city=Sector+137" className="hover:text-white transition">Sector 137, Expressway</Link>
              </li>
              <li>
                <Link href="/properties?city=Greater+Noida+West" className="hover:text-white transition">Greater Noida West</Link>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Contact</h4>
            <div className="space-y-2 text-xs">
              <p>{contactAddress || "Sector 62, Noida, Uttar Pradesh 201309"}</p>
              <p>
                <a href={`tel:${contactPhone || "+919876543210"}`} className="hover:text-white transition">
                  {contactPhone || "+91 98765 43210"}
                </a>
              </p>
              <p>
                <a href={`mailto:${contactEmail || "info@noidaprimeproperty.com"}`} className="hover:text-white transition">
                  {contactEmail || "info@noidaprimeproperty.com"}
                </a>
              </p>
              <div className="pt-2">
                <Link
                  href="/register"
                  className="inline-block rounded-md bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-[11px] font-bold text-white transition"
                >
                  Post Property Free
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} {brandTitle}. All rights reserved.
          </div>
          <div className="flex gap-4">
            <Link href="/properties" className="hover:text-slate-400">All Properties</Link>
            <Link href="/login" className="hover:text-slate-400">Portal Login</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
