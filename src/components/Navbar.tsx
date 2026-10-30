import Link from "next/link";
import { auth } from "@/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { LocationMenu } from "@/components/LocationMenu";
import { NavbarMobileMenu } from "@/components/NavbarMobileMenu";

type NavLink = { href: string; label: string };

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

  const links: NavLink[] = [
    { href: "/properties?listingType=SALE", label: "Buy" },
    { href: "/properties?listingType=RENT", label: "Rent" },
    { href: "/projects", label: "Projects" },
    { href: "/properties?propertyType=COMMERCIAL", label: "Commercial" },
    { href: "/properties?propertyType=PLOT", label: "Plots" },
  ];

  if (
    session?.user.role === "OWNER" ||
    session?.user.role === "DEALER" ||
    session?.user.role === "SUBADMIN"
  ) {
    links.push({ href: "/dashboard", label: "My Listings" });
  }
  if (session?.user.role === "BUYER") {
    links.push({ href: "/buyer/dashboard", label: "My Account" });
  }
  if (session?.user.role === "ADMIN") {
    links.push({ href: "/admin", label: "Admin" });
  }

  const authLinks: NavLink[] = session
    ? []
    : [
        { href: "/login", label: "Log in" },
      ];

  const brandTitle = siteName && siteName !== "BayaEstate" ? siteName : "Noida Prime Properties";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Brand & City */}
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/" className="group flex min-w-0 items-center gap-2.5">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={brandTitle} className="h-8 w-auto shrink-0 object-contain" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-black text-white shadow-xs">
                NP
              </span>
            )}
            <div className="flex flex-col">
              <span className="truncate text-base font-extrabold tracking-tight text-slate-900 group-hover:text-blue-600 transition leading-tight">
                {brandTitle}
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none">
                Verified Real Estate
              </span>
            </div>
          </Link>
          <div className="hidden sm:block">
            <LocationMenu currentCity={currentCity} cities={cities} />
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden items-center gap-1 text-sm font-semibold text-slate-600 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-1.5 transition hover:bg-slate-100 hover:text-slate-900"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          {session ? (
            <>
              {session.user.role === "OWNER" && (
                <Link
                  href="/dashboard/properties/new"
                  className="hidden rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-extrabold text-white shadow-xs transition sm:inline-flex items-center gap-1.5"
                >
                  <span>+ List Property</span>
                </Link>
              )}
              {session.user.role === "AGENT" && (
                <Link
                  href="/agent/listings/new"
                  className="hidden rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-extrabold text-white shadow-xs transition sm:inline-flex items-center gap-1.5"
                >
                  <span>+ Add Listing</span>
                </Link>
              )}
              <span className="hidden text-xs sm:text-sm font-bold text-slate-700 sm:inline bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                {session.user.name}
              </span>
              <LogoutButton className="hidden rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 sm:inline-block cursor-pointer" />
            </>
          ) : (
            <>
              {/* Button 1: Log in (for Buyers, Channel Partners, and Admins) */}
              <Link
                href="/login"
                className="hidden text-xs sm:text-sm font-bold text-slate-700 hover:text-blue-600 sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition shadow-2xs"
                title="Buyer & Channel Partner Login"
              >
                <span>👤</span>
                <span>Log in</span>
              </Link>

              {/* Button 2: List Property (Direct for Property Owners) */}
              <Link
                href="/register"
                className="hidden rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-black text-white shadow-sm transition sm:inline-flex items-center gap-1.5 hover:scale-[1.01] active:scale-[0.99]"
              >
                <span>List Property</span>
                <span className="rounded bg-blue-500/90 px-1.5 py-0.5 text-[9px] font-black uppercase text-white tracking-wider">
                  OWNER
                </span>
              </Link>
            </>
          )}

          <NavbarMobileMenu>
            <div className="flex flex-col gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="my-2 border-t border-slate-100" />

            {session ? (
              <div className="space-y-2 px-3 py-2">
                <p className="text-sm font-bold text-slate-900">{session.user.name}</p>
                {session.user.role === "OWNER" && (
                  <Link
                    href="/dashboard/properties/new"
                    className="block w-full rounded-xl bg-blue-600 text-white text-center font-bold text-xs py-2"
                  >
                    + List Property
                  </Link>
                )}
                {session.user.role === "AGENT" && (
                  <Link
                    href="/agent/listings/new"
                    className="block w-full rounded-xl bg-emerald-600 text-white text-center font-bold text-xs py-2"
                  >
                    + Add Listing
                  </Link>
                )}
                <LogoutButton className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100" />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/login"
                  className="rounded-xl border border-slate-200 px-4 py-2 text-center text-xs font-bold text-slate-800 hover:bg-slate-50"
                >
                  👤 Log in (Buyer / Agent / Admin)
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-center text-xs font-black text-white transition hover:bg-blue-700 shadow-xs flex items-center justify-center gap-1.5"
                >
                  <span>List Property</span>
                  <span className="rounded bg-blue-500/90 px-1.5 py-0.5 text-[9px] font-black uppercase text-white">
                    OWNER
                  </span>
                </Link>
              </div>
            )}
          </NavbarMobileMenu>
        </div>
      </div>
    </header>
  );
}
