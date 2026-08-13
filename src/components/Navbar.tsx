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
    { href: "/", label: "Home" },
    { href: "/properties", label: "Properties" },
    { href: "/developers", label: "Developers" },
    { href: "/dealers", label: "Dealers" },
    { href: "/owners", label: "Owners" },
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
        { href: "/buyer/login", label: "Buyer login" },
        { href: "/login", label: "Log in" },
      ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={siteName} className="h-8 w-auto shrink-0 object-contain" />
            )}
            <span className="truncate">{siteName}</span>
          </Link>
          <LocationMenu currentCity={currentCity} cities={cities} />
        </div>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-slate-900">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {session ? (
            <>
              <span className="hidden text-sm text-slate-500 sm:inline">{session.user.name}</span>
              <LogoutButton className="hidden rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 sm:inline-block" />
            </>
          ) : (
            <>
              {authLinks.map((link) => (
                <Link key={link.href} href={link.href} className="hidden text-sm font-medium text-slate-700 hover:text-slate-900 sm:inline">
                  {link.label}
                </Link>
              ))}
              <Link
                href="/register"
                className="hidden rounded-full bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700 sm:inline-block"
              >
                List a property
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
                    className="block w-full rounded-full bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-blue-700"
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
