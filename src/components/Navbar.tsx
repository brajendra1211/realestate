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
    { href: "/developers", label: "Developers" },
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
  if (session?.user.role === "AGENT") {
    links.push({ href: "/agent/dashboard", label: "Channel Partner Hub" });
    links.push({ href: "/agent/dashboard#my-qr", label: "My Shop QR" });
  }
  if (session?.user.role === "INVESTOR") {
    links.push({ href: "/investor/dashboard", label: "Referral Partner Portal" });
  }
  if (session?.user.role === "ADMIN") {
    links.push({ href: "/admin", label: "Admin" });
  }

  const authLinks: NavLink[] = session
    ? []
    : [
        { href: "/login", label: "Log in" },
      ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white shadow-xs">
      {/* 99acres top blue accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-[#003b6d] via-[#0054a6] to-[#0074d9]" />

      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="group flex min-w-0 items-center gap-2">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={siteName} className="h-8 w-auto shrink-0 object-contain" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0054a6] text-base font-black text-white shadow-sm shadow-blue-600/30 transition group-hover:scale-105">
                {siteName.charAt(0)}
              </span>
            )}
            <div className="flex flex-col">
              <span className="truncate text-lg font-black tracking-tight text-[#0054a6] group-hover:text-[#003b6d] transition leading-tight">
                {siteName}
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                Property Portal
              </span>
            </div>
          </Link>
          <LocationMenu currentCity={currentCity} cities={cities} />
        </div>

        <nav className="hidden items-center gap-0.5 text-xs lg:text-sm font-bold text-slate-700 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-2.5 py-1.5 transition hover:bg-slate-100 hover:text-[#0054a6]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {session ? (
            <>
              <span className="hidden text-xs sm:text-sm font-semibold text-slate-600 sm:inline">
                {session.user.name}
              </span>
              <LogoutButton className="hidden rounded-full border border-slate-300 px-3.5 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-100 sm:inline-block" />
            </>
          ) : (
            <>
              {authLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="hidden text-xs sm:text-sm font-bold text-slate-700 hover:text-[#0054a6] sm:inline"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/register"
                className="hidden rounded-full bg-[#0054a6] hover:bg-[#004080] px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:shadow-md sm:inline-flex items-center gap-1.5"
              >
                <span>Post Property</span>
                <span className="rounded-full bg-emerald-500 px-1.5 py-0.2 text-[9px] font-black uppercase text-white tracking-wider">
                  FREE
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
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="my-2 border-t border-slate-100" />

            {session ? (
              <div className="space-y-2 px-3 py-2">
                <p className="text-sm text-slate-500">{session.user.name}</p>
                <LogoutButton className="w-full rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100" />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {authLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="px-3 py-2">
                  <Link
                    href="/register"
                    className="block w-full rounded-full bg-linear-to-r from-blue-600 to-indigo-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm shadow-blue-600/25 transition hover:brightness-105"
                  >
                    List a property
                  </Link>
                </div>
              </div>
            )}
          </NavbarMobileMenu>
        </div>
      </div>
    </header>
  );
}
