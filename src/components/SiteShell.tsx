"use client";

import { usePathname } from "next/navigation";

export function SiteShell({
  children,
  navbar,
  footer,
  whatsapp,
  mobileNav,
}: {
  children: React.ReactNode;
  navbar: React.ReactNode;
  footer: React.ReactNode;
  whatsapp: React.ReactNode;
  mobileNav: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  if (isAdmin) {
    return <main className="flex-1">{children}</main>;
  }

  // Signed-in work portals keep the top navbar but drop the marketing footer
  // and floating site widgets, so they feel like an app, not a web page.
  const isPortal = /^\/(agent|dashboard|investor)(\/|$)/.test(pathname ?? "");
  if (isPortal) {
    return (
      <>
        {navbar}
        <main className="flex-1">{children}</main>
      </>
    );
  }

  return (
    <>
      {navbar}
      <main className="flex-1">{children}</main>
      {footer}
      {whatsapp}
      {mobileNav}
    </>
  );
}
