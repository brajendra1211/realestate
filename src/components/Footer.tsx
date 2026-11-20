import Link from "next/link";
import { Mail, Phone, MapPin, ShieldCheck, Handshake, Eye } from "lucide-react";
import { TRUST_BADGES } from "@/content/site-copy";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Buy",
    links: [
      { href: "/properties?listingType=SALE", label: "All homes for sale" },
      { href: "/properties?listingType=SALE&propertyType=APARTMENT", label: "Flats & penthouses" },
      { href: "/properties?listingType=SALE&propertyType=VILLA", label: "Gated luxury villas" },
      { href: "/properties?listingType=SALE&condition=NEW_BOOKING", label: "New booking projects" },
    ],
  },
  {
    title: "Rent",
    links: [
      { href: "/properties?listingType=RENT", label: "All verified rentals" },
      { href: "/properties?listingType=RENT&propertyType=APARTMENT", label: "Rental flats" },
      { href: "/properties?listingType=RENT&propertyType=PG", label: "PG & co-living" },
      { href: "/properties?listingType=RENT&propertyType=COMMERCIAL", label: "Commercial spaces" },
      { href: "/properties?listingType=RENT&propertyType=VILLA", label: "Villas & houses" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About us, vision & mission" },
      { href: "/commission-policy", label: "Commission policy" },
      { href: "/faq", label: "FAQ" },
      { href: "/reviews", label: "Market reviews" },
      { href: "/case-studies", label: "Case studies" },
      { href: "/legal-cell", label: "Legal cell & success stories" },
    ],
  },
  {
    title: "Top metros",
    links: [
      { href: "/properties?city=Noida", label: "Noida" },
      { href: "/properties?city=Gurgaon", label: "Gurgaon" },
      { href: "/properties?city=Delhi+NCR", label: "Delhi NCR" },
      { href: "/properties?city=Bengaluru", label: "Bengaluru" },
      { href: "/properties?city=Mumbai", label: "Mumbai" },
    ],
  },
];

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
  const brandTitle =
    siteName &&
    siteName !== "BayaEstate" &&
    !siteName.toLowerCase().includes("noida prime") &&
    !siteName.toLowerCase().includes("baya prime")
      ? siteName
      : "Pronesto";

  return (
    <footer className="relative overflow-hidden bg-brand-950 text-sm text-slate-400">
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-brand-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-gold-400/10 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-7">
          <div className="space-y-5 lg:col-span-2">
            <Link href="/" className="font-display inline-block text-3xl font-semibold text-white">
              {brandTitle.toLowerCase()}
              <span className="text-gold-400">.</span>
            </Link>
            <p className="max-w-sm leading-relaxed">
              {tagline ||
                "Zero-brokerage rentals and admin-verified homes for sale across Noida, Gurgaon, Delhi NCR, Mumbai and Bengaluru."}
            </p>
            <ul className="space-y-2.5 text-[13px]">
              <li className="flex items-center gap-2.5"><ShieldCheck className="h-4 w-4 text-gold-400" /> Title-audited buy inventory</li>
              <li className="flex items-center gap-2.5"><Handshake className="h-4 w-4 text-gold-400" /> Zero-brokerage rental marketplace</li>
              <li className="flex items-center gap-2.5"><Eye className="h-4 w-4 text-gold-400" /> Transparent direct-connect platform</li>
            </ul>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="transition hover:translate-x-0.5 hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-white">Contact</h4>
            <ul className="space-y-3 text-[13px]">
              {contactEmail && (
                <li className="flex items-start gap-2.5">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
                  <a href={`mailto:${contactEmail}`} className="break-all hover:text-white">{contactEmail}</a>
                </li>
              )}
              {contactPhone && (
                <li className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
                  <a href={`tel:${contactPhone}`} className="hover:text-white">{contactPhone}</a>
                </li>
              )}
              {contactAddress && (
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
                  <span>{contactAddress}</span>
                </li>
              )}
              {!contactEmail && !contactPhone && !contactAddress && (
                <li>
                  <Link href="/login" className="hover:text-white">Portal login</Link>
                </li>
              )}
            </ul>
          </div>
        </div>

        <ul className="mt-12 flex flex-wrap items-center justify-center gap-2 border-t border-white/10 pt-8">
          {TRUST_BADGES.map((b) => (
            <li key={b} className="rounded-full bg-white/5 px-3.5 py-1.5 text-[11px] font-semibold text-slate-300 ring-1 ring-white/10">
              {b}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row">
          <div>
            © {new Date().getFullYear()} {brandTitle} (
            <a href="https://pronesto.in/" target="_blank" rel="noopener noreferrer" className="hover:text-white">pronesto.in</a>
            ). All rights reserved.
          </div>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            <Link href="/properties" className="hover:text-white">All properties</Link>
            <Link href="/login" className="hover:text-white">Portal login</Link>
            <Link href="/login?as=investor" className="hover:text-white">Referral partner login</Link>
            <Link href="/support" className="hover:text-white">Support</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/commission-policy" className="hover:text-white">Commission Policy</Link>
            <Link href="/faq" className="hover:text-white">FAQ</Link>
            <Link href="/privacy-policy" className="hover:text-white">Privacy Policy</Link>
            <Link href="/account-deletion" className="hover:text-white">Delete Account</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
