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
