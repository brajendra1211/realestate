import Link from "next/link";
import {
  ChevronDown,
  Building2,
  Home,
  Briefcase,
  BedDouble,
  Rocket,
  Crown,
  Plus,
  LayoutDashboard,
  UserRound,
  ArrowRight,
  LogIn,
  TrendingUp,
  Handshake,
  ShieldCheck,
} from "lucide-react";
import { auth } from "@/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { LocationMenu } from "@/components/LocationMenu";
import { NavbarMobileMenu } from "@/components/NavbarMobileMenu";

type MenuItem = { href: string; title: string; desc: string; icon: React.ReactNode };

const BUY_ITEMS: MenuItem[] = [
  { href: "/properties?listingType=SALE&propertyType=APARTMENT", title: "Luxury Flats & Penthouses", desc: "High-rise gated societies", icon: <Building2 className="h-4 w-4" /> },
  { href: "/properties?listingType=SALE&propertyType=VILLA", title: "Villas & Estates", desc: "Golf & private-pool residences", icon: <Home className="h-4 w-4" /> },
  { href: "/properties?listingType=SALE&condition=NEW_BOOKING", title: "New Booking Projects", desc: "RERA registered launches", icon: <Rocket className="h-4 w-4" /> },
];
const BUY_BUDGETS = [
  { href: "/properties?listingType=SALE&maxPrice=10000000", label: "Under ₹1 Crore" },
  { href: "/properties?listingType=SALE&minPrice=10000000&maxPrice=30000000", label: "₹1 Cr – ₹3 Cr" },
  { href: "/properties?listingType=SALE&minPrice=30000000&maxPrice=70000000", label: "₹3 Cr – ₹7 Cr" },
  { href: "/properties?listingType=SALE&minPrice=70000000", label: "Ultra luxury ₹7 Cr+" },
];

const RENT_ITEMS: MenuItem[] = [
  { href: "/properties?listingType=RENT&propertyType=APARTMENT", title: "Flats & Apartments", desc: "1 to 4+ BHK, furnished", icon: <Building2 className="h-4 w-4" /> },
  { href: "/properties?listingType=RENT&propertyType=PG", title: "PG & Co-Living", desc: "Boys, girls & unisex with meals", icon: <BedDouble className="h-4 w-4" /> },
  { href: "/properties?listingType=RENT&propertyType=COMMERCIAL", title: "Commercial Spaces", desc: "Offices, shops & warehouses", icon: <Briefcase className="h-4 w-4" /> },
];
const RENT_BUDGETS = [
  { href: "/properties?listingType=RENT&maxPrice=20000", label: "Under ₹20,000 / month" },
  { href: "/properties?listingType=RENT&minPrice=20000&maxPrice=50000", label: "₹20,000 – ₹50,000" },
  { href: "/properties?listingType=RENT&minPrice=50000&maxPrice=100000", label: "₹50,000 – ₹1 Lakh" },
];

function MegaMenu({
  label,
  href,
  items,
  budgets,
  budgetTitle,
  cta,
  width,
}: {
  label: string;
  href: string;
  items: MenuItem[];
  budgets: { href: string; label: string }[];
  budgetTitle: string;
  cta: string;
  width: string;
}) {
  return (
    <div className="group relative">
      <Link
        href={href}
        className="flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-brand-50 hover:text-brand-700"
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 transition duration-300 group-hover:rotate-180 group-hover:text-brand-600" />
      </Link>

      <div
        className={`invisible absolute left-1/2 top-full z-50 -translate-x-1/2 translate-y-2 pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 ${width}`}
      >
        <div className="grid grid-cols-[1.3fr_1fr] gap-2 rounded-3xl border border-slate-200/80 bg-white p-3 shadow-[0_30px_80px_-20px_rgba(10,18,48,0.25)]">
          <div className="space-y-0.5">
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className="group/item flex items-center gap-3 rounded-2xl p-2.5 transition hover:bg-brand-50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover/item:bg-brand-600 group-hover/item:text-white">
                  {it.icon}
                </span>
                <span>
                  <span className="block text-sm font-bold text-ink">{it.title}</span>
                  <span className="block text-xs text-slate-500">{it.desc}</span>
                </span>
              </Link>
            ))}
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="px-1 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              {budgetTitle}
            </div>
            {budgets.map((b) => (
              <Link
                key={b.href}
                href={b.href}
                className="block rounded-lg px-2 py-1.5 text-[13px] font-medium text-slate-700 transition hover:bg-white hover:text-brand-700"
              >
                {b.label}
              </Link>
            ))}
            <Link
              href={href}
              className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-ink py-2 text-xs font-bold text-white transition hover:bg-brand-600"
            >
              {cta} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const pillBtn =
  "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-brand-600 hover:text-brand-700";

export async function Navbar({
  siteName,
  logoUrl,
  currentCity,
  cities,
}: {
  siteName: string;
  logoUrl?: string | null;
  currentCity: { slug: string; name: string } | null;
  cities: { slug: string; name: string }[];
}) {
  const session = await auth();

  const brandTitle =
    siteName &&
    siteName !== "BayaEstate" &&
    !siteName.toLowerCase().includes("noida prime") &&
    !siteName.toLowerCase().includes("baya prime")
      ? siteName
      : "Pronesto";

  const role = session?.user.role;

  return (
    <header className="glass sticky top-0 z-50 border-b border-slate-200/70">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex shrink-0 items-center gap-4">
          <Link href="/" className="group flex items-center">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={brandTitle} className="h-8 w-auto shrink-0 object-contain" />
            ) : (
              <span className="font-display text-[28px] font-semibold tracking-tight text-brand-900 transition group-hover:text-brand-600">
                pronesto<span className="text-gold-500">.</span>
              </span>
            )}
          </Link>
          <div className="hidden sm:block">
            <LocationMenu currentCity={currentCity} cities={cities} />
          </div>
        </div>

        <nav className="hidden items-center gap-0.5 md:flex">
          <MegaMenu label="Buy" href="/properties?listingType=SALE" items={BUY_ITEMS} budgets={BUY_BUDGETS} budgetTitle="By budget" cta="All properties for sale" width="w-[560px]" />
          <MegaMenu label="Rent" href="/properties?listingType=RENT" items={RENT_ITEMS} budgets={RENT_BUDGETS} budgetTitle="By monthly budget" cta="Browse all rentals" width="w-[560px]" />
          {[
            { href: "/properties?propertyType=COMMERCIAL", label: "Commercial" },
            { href: "/properties?propertyType=PG", label: "PG / Co-Living" },
          ].map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="rounded-full px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-brand-50 hover:text-brand-700"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          {role === "ADMIN" ? (
            <Link href="/dashboard/properties/new" className={`${pillBtn} max-sm:hidden`}>
              <Plus className="h-4 w-4" /> Add listing
            </Link>
          ) : role === "AGENT" ? (
            <Link href="/agent/listings/new" className={`${pillBtn} max-sm:hidden`}>
              <Plus className="h-4 w-4" /> Add rent listing
            </Link>
          ) : (
            <Link href="/list-property/request" className={`${pillBtn} max-sm:hidden`}>
              Post property
            </Link>
          )}

          {session ? (
            <div className="group relative">
              <button
                type="button"
                className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-sm font-semibold text-ink transition hover:border-brand-600"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-400 text-xs font-bold text-white">
                  {session.user.name ? session.user.name.charAt(0).toUpperCase() : "U"}
                </span>
                <span className="hidden max-w-[100px] truncate sm:inline">{session.user.name}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              <div className="invisible absolute right-0 top-full z-50 w-60 translate-y-2 pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-[0_30px_80px_-20px_rgba(10,18,48,0.25)]">
                  <div className="border-b border-slate-100 px-3 py-2.5">
                    <p className="truncate text-sm font-bold text-ink">{session.user.name}</p>
                    <p className="truncate text-xs text-slate-400">{session.user.email}</p>
                  </div>
                  {role === "ADMIN" && <MenuLink href="/admin" icon={<Crown className="h-4 w-4" />}>Admin console</MenuLink>}
                  {role === "AGENT" && <MenuLink href="/agent/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>Partner hub</MenuLink>}
                  {(role === "OWNER" || role === "DEALER") && <MenuLink href="/dashboard" icon={<Home className="h-4 w-4" />}>My listings</MenuLink>}
                  {role === "BUYER" && <MenuLink href="/buyer/dashboard" icon={<UserRound className="h-4 w-4" />}>My activity</MenuLink>}
                  {role === "INVESTOR" && <MenuLink href="/investor/dashboard" icon={<TrendingUp className="h-4 w-4" />}>Referral partner portal</MenuLink>}
                  <div className="mt-1 border-t border-slate-100 pt-1">
                    <LogoutButton className="w-full cursor-pointer rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="group relative">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-600"
              >
                <LogIn className="h-4 w-4" /> Sign in <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </Link>
              <div className="invisible absolute right-0 top-full z-50 w-64 translate-y-2 pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-[0_30px_80px_-20px_rgba(10,18,48,0.25)]">
                  <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Sign in as</p>
                  <MenuLink href="/login" icon={<UserRound className="h-4 w-4" />}>Buyer / Owner</MenuLink>
                  <MenuLink href="/login?as=agent" icon={<Handshake className="h-4 w-4" />}>Channel partner</MenuLink>
                  <MenuLink href="/login?as=investor" icon={<TrendingUp className="h-4 w-4" />}>Referral partner</MenuLink>
                  <MenuLink href="/login?as=admin" icon={<ShieldCheck className="h-4 w-4" />}>Admin</MenuLink>
                </div>
              </div>
            </div>
          )}

          <NavbarMobileMenu>
            <div className="space-y-1 py-2 text-base">
              {[
                { href: "/properties?listingType=SALE", l: "Buy properties" },
                { href: "/properties?listingType=RENT", l: "Rental properties" },
                { href: "/properties?propertyType=COMMERCIAL", l: "Commercial" },
                { href: "/properties?propertyType=PG", l: "PG / Co-Living" },
                { href: "/list-property/request", l: "Post property" },
              ].map((x) => (
                <Link key={x.href} href={x.href} className="block rounded-xl px-3 py-3 font-semibold text-ink hover:bg-brand-50">
                  {x.l}
                </Link>
              ))}
              <div className="mt-2 border-t border-slate-100 pt-3">
                {session ? (
                  <LogoutButton className="w-full px-3 py-2 text-left font-bold text-rose-600" />
                ) : (
                  <div className="space-y-0.5">
                    <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Sign in as</p>
                    {[
                      { href: "/login", l: "Buyer / Owner" },
                      { href: "/login?as=agent", l: "Channel partner" },
                      { href: "/login?as=investor", l: "Referral partner" },
                      { href: "/login?as=admin", l: "Admin" },
                    ].map((x) => (
                      <Link key={x.href} href={x.href} className="block px-3 py-2 font-bold text-brand-700">
                        {x.l}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </NavbarMobileMenu>
        </div>
      </div>
    </header>
  );
}

function MenuLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-brand-50 hover:text-brand-700"
    >
      <span className="text-slate-400">{icon}</span>
      {children}
    </Link>
  );
}
